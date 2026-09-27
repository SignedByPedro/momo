-- Momo v2.12 — Client offboarding + 90-day recovery window
--
-- Normal service cancellation is NOT the same as an explicit data-deletion
-- instruction. A normal cancellation enters a recovery window during which the
-- public widget and normal portal use are suspended, but the organisation data is
-- retained so the client can be reactivated. Once the window expires, the client
-- is marked purge_due for final admin-confirmed deletion.
--
-- This migration does not automatically delete an organisation or auth users.

alter table public.organizations
  add column if not exists terminated_at timestamptz,
  add column if not exists recovery_until timestamptz,
  add column if not exists termination_reason text,
  add column if not exists status_before_termination text,
  add column if not exists terminated_by_user_id uuid,
  add column if not exists terminated_by_email text;

-- The status check may have been created outside the migrations currently kept in
-- the repo. Replace only CHECK constraints on organizations that explicitly refer
-- to the status column, then install the canonical v2.12 constraint.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.organizations'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* '(^|[^a-z_])status([^a-z_]|$)'
  loop
    execute format('alter table public.organizations drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.organizations
  add constraint organizations_status_check
  check (status in ('setup', 'active', 'paused', 'cancelled', 'purge_due'));

alter table public.organizations
  drop constraint if exists organizations_status_before_termination_check;

alter table public.organizations
  add constraint organizations_status_before_termination_check
  check (
    status_before_termination is null
    or status_before_termination in ('setup', 'active', 'paused')
  );

create index if not exists organizations_recovery_due_idx
  on public.organizations (recovery_until)
  where status = 'cancelled';

create index if not exists organizations_purge_due_idx
  on public.organizations (updated_at desc)
  where status = 'purge_due';

create or replace function public.retention_mark_terminated_clients_due()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.organizations
  set status = 'purge_due',
      updated_at = now()
  where status = 'cancelled'
    and recovery_until is not null
    and recovery_until <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.retention_mark_terminated_clients_due() from public;

-- Keep expiry marking independent from destructive retention cleanup. This job
-- only changes cancelled -> purge_due; it never deletes customer data.
create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'momo-offboarding-recovery-expiry'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'momo-offboarding-recovery-expiry',
    '35 3 * * *',
    $cron$select public.retention_mark_terminated_clients_due();$cron$
  );
end;
$$;


-- Align automatic retention audit snapshots with policy v0.6. The underlying
-- time-based deletion categories are unchanged; this only updates the policy
-- metadata now that normal cancellation has a 90-day recovery window.
update public.data_retention_automation
set policy_version = '0.6',
    updated_at = now()
where id = 1;

create or replace function public.retention_run_automatic_cycle()
returns table (
  cycle_status text,
  dry_run_id uuid,
  cleanup_run_id uuid,
  eligible_total bigint,
  deleted_total bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.data_retention_automation%rowtype;
  v_now timestamptz := now();
  v_customer_conversation_cutoff timestamptz;
  v_customer_lead_cutoff timestamptz;
  v_support_cutoff timestamptz;
  v_sales_cutoff timestamptz;
  v_report jsonb := '[]'::jsonb;
  v_eligible_total bigint := 0;
  v_dry_run_id uuid;
  v_cleanup_run_id uuid;
  v_deleted_total bigint := 0;
  v_cleanup_report jsonb;
  v_error text;
begin
  select *
  into v_config
  from public.data_retention_automation
  where id = 1
  for update;

  if not found then
    raise exception 'RETENTION_AUTOMATION_CONFIG_MISSING';
  end if;

  if not v_config.enabled then
    update public.data_retention_automation
    set last_status = 'disabled',
        last_error = null,
        updated_at = now()
    where id = 1;

    return query select 'disabled'::text, null::uuid, null::uuid, 0::bigint, 0::bigint;
    return;
  end if;

  update public.data_retention_automation
  set last_started_at = v_now,
      last_status = 'running',
      last_error = null,
      updated_at = v_now
  where id = 1;

  begin
    v_customer_conversation_cutoff := v_now - make_interval(months => v_config.customer_conversation_months);
    v_customer_lead_cutoff := v_now - make_interval(months => v_config.customer_lead_months);
    v_support_cutoff := v_now - make_interval(months => v_config.resolved_support_months);
    v_sales_cutoff := v_now - make_interval(months => v_config.dormant_sales_months);

    select
      coalesce(
        jsonb_agg(to_jsonb(report_row) order by report_row.organization_name, report_row.category),
        '[]'::jsonb
      ),
      coalesce(sum(report_row.eligible_count), 0)::bigint
    into v_report, v_eligible_total
    from public.retention_dry_run_report(
      v_customer_conversation_cutoff,
      v_customer_lead_cutoff,
      v_support_cutoff,
      v_sales_cutoff
    ) report_row;

    insert into public.data_retention_runs (
      mode,
      trigger_source,
      status,
      executed_by_user_id,
      executed_by_email,
      policy_version,
      policy_snapshot,
      report,
      eligible_total,
      deleted_total
    ) values (
      'dry_run',
      'automatic',
      'completed',
      null,
      'system:retention-automation',
      v_config.policy_version,
      jsonb_build_object(
        'generated_at', v_now,
        'customer_conversations_months', v_config.customer_conversation_months,
        'customer_leads_months', v_config.customer_lead_months,
        'resolved_support_months', v_config.resolved_support_months,
        'dormant_sales_months', v_config.dormant_sales_months,
        'post_termination_recovery_days', 90,
        'security_data_days', 90,
        'cutoffs', jsonb_build_object(
          'customer_conversation_cutoff', v_customer_conversation_cutoff,
          'customer_lead_cutoff', v_customer_lead_cutoff,
          'support_cutoff', v_support_cutoff,
          'sales_cutoff', v_sales_cutoff
        ),
        'exclusions', jsonb_build_array(
          'post_termination_final_purge',
          'security_rate_limit_records'
        ),
        'automation', jsonb_build_object(
          'schedule', v_config.schedule_cron,
          'timezone', v_config.schedule_timezone
        )
      ),
      v_report,
      v_eligible_total,
      0
    )
    returning id into v_dry_run_id;

    if v_eligible_total = 0 then
      update public.data_retention_automation
      set last_completed_at = now(),
          last_status = 'no_data',
          last_run_id = v_dry_run_id,
          last_error = null,
          updated_at = now()
      where id = 1;

      return query select 'no_data'::text, v_dry_run_id, null::uuid, 0::bigint, 0::bigint;
      return;
    end if;

    begin
      select result.cleanup_run_id, result.deleted_total, result.cleanup_report
      into v_cleanup_run_id, v_deleted_total, v_cleanup_report
      from public.retention_execute_cleanup(
        v_dry_run_id,
        null,
        'system:retention-automation'
      ) result;
    exception when others then
      v_error := left(sqlerrm, 500);

      insert into public.data_retention_runs (
        mode,
        trigger_source,
        source_run_id,
        status,
        executed_by_user_id,
        executed_by_email,
        policy_version,
        policy_snapshot,
        report,
        eligible_total,
        deleted_total,
        error_summary
      )
      select
        'cleanup',
        'automatic',
        v_dry_run_id,
        'failed',
        null,
        'system:retention-automation',
        policy_version,
        policy_snapshot,
        report,
        eligible_total,
        0,
        v_error
      from public.data_retention_runs
      where id = v_dry_run_id;

      update public.data_retention_automation
      set last_completed_at = now(),
          last_status = 'failed',
          last_run_id = v_dry_run_id,
          last_error = v_error,
          updated_at = now()
      where id = 1;

      raise warning 'Momo automatic retention cleanup failed: %', v_error;
      return query select 'failed'::text, v_dry_run_id, null::uuid, v_eligible_total, 0::bigint;
      return;
    end;

    update public.data_retention_automation
    set last_completed_at = now(),
        last_status = 'completed',
        last_run_id = v_cleanup_run_id,
        last_error = null,
        updated_at = now()
    where id = 1;

    return query select 'completed'::text, v_dry_run_id, v_cleanup_run_id, v_eligible_total, v_deleted_total;
    return;
  exception when others then
    v_error := left(sqlerrm, 500);

    update public.data_retention_automation
    set last_completed_at = now(),
        last_status = 'failed',
        last_error = v_error,
        updated_at = now()
    where id = 1;

    raise warning 'Momo automatic retention cycle failed before cleanup: %', v_error;
    return query select 'failed'::text, v_dry_run_id, null::uuid, coalesce(v_eligible_total, 0), 0::bigint;
    return;
  end;
end;
$$;

revoke all on function public.retention_run_automatic_cycle() from public;

-- Keep Momo Support documentation aligned with the new offboarding flow.
insert into public.knowledge_entries (slug, agent_key, category, title, content, visibility, status)
select
  'momo-support-account-cancellation-recovery',
  'momo-support',
  'Account & Privacy',
  'Service cancellation and recovery window',
  'A normal service cancellation is different from an explicit data-deletion request. When the Momo team closes an organisation normally, the service enters a 90-day recovery window: normal portal operation is suspended, the public widget is unavailable, and the organisation data is retained so the customer can request reactivation without rebuilding the account. The organisation owner can still sign in to the recovery screen, download the organisation data export, and use Momo Support. If the customer explicitly asks for deletion/return of personal data, use the separate Privacy deletion-request workflow; do not tell the customer they must wait 90 days before a verified deletion request can be handled. After the normal recovery window expires, the organisation is marked for final deletion review.',
  'public',
  'published'
where not exists (
  select 1
  from public.knowledge_entries
  where agent_key = 'momo-support'
    and slug = 'momo-support-account-cancellation-recovery'
);

update public.knowledge_entries
set
  category = 'Account & Privacy',
  title = 'Service cancellation and recovery window',
  content = 'A normal service cancellation is different from an explicit data-deletion request. When the Momo team closes an organisation normally, the service enters a 90-day recovery window: normal portal operation is suspended, the public widget is unavailable, and the organisation data is retained so the customer can request reactivation without rebuilding the account. The organisation owner can still sign in to the recovery screen, download the organisation data export, and use Momo Support. If the customer explicitly asks for deletion/return of personal data, use the separate Privacy deletion-request workflow; do not tell the customer they must wait 90 days before a verified deletion request can be handled. After the normal recovery window expires, the organisation is marked for final deletion review.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-account-cancellation-recovery';
