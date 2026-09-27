-- Momo v2.11 — Scheduled automatic retention cleanup
-- Adds a guarded Supabase Cron job for the time-based categories already covered
-- by the manual retention engine. The schedule is installed but DISABLED at the
-- product-config level by default; an admin must explicitly activate it.
--
-- Schedule: every day at 03:15 UTC.
-- The automatic cycle creates its own dry-run immediately before cleanup and then
-- reuses the same fingerprint/count validation and atomic delete function as the
-- manual flow.

alter table public.data_retention_runs
  add column if not exists trigger_source text not null default 'manual';

alter table public.data_retention_runs
  drop constraint if exists data_retention_runs_trigger_source_check;

alter table public.data_retention_runs
  add constraint data_retention_runs_trigger_source_check
  check (trigger_source in ('manual', 'automatic'));

create index if not exists data_retention_runs_trigger_created_idx
  on public.data_retention_runs (trigger_source, created_at desc);

create table if not exists public.data_retention_automation (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  schedule_cron text not null default '15 3 * * *',
  schedule_timezone text not null default 'UTC',
  policy_version text not null default '0.5',
  customer_conversation_months integer not null default 12 check (customer_conversation_months between 1 and 120),
  customer_lead_months integer not null default 12 check (customer_lead_months between 1 and 120),
  resolved_support_months integer not null default 12 check (resolved_support_months between 1 and 120),
  dormant_sales_months integer not null default 12 check (dormant_sales_months between 1 and 120),
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_status text not null default 'never',
  last_run_id uuid references public.data_retention_runs(id) on delete set null,
  last_error text,
  updated_by_user_id uuid,
  updated_by_email text,
  updated_at timestamptz not null default now(),
  constraint data_retention_automation_status_check
    check (last_status in ('never', 'disabled', 'running', 'no_data', 'completed', 'failed'))
);

alter table public.data_retention_automation enable row level security;
-- No authenticated/anon policies are added. Admin UI uses the service-role client.

insert into public.data_retention_automation (
  id,
  enabled,
  schedule_cron,
  schedule_timezone,
  policy_version,
  customer_conversation_months,
  customer_lead_months,
  resolved_support_months,
  dormant_sales_months
) values (
  1,
  false,
  '15 3 * * *',
  'UTC',
  '0.5',
  12,
  12,
  12,
  12
)
on conflict (id) do update set
  schedule_cron = excluded.schedule_cron,
  schedule_timezone = excluded.schedule_timezone,
  policy_version = excluded.policy_version,
  customer_conversation_months = excluded.customer_conversation_months,
  customer_lead_months = excluded.customer_lead_months,
  resolved_support_months = excluded.resolved_support_months,
  dormant_sales_months = excluded.dormant_sales_months,
  updated_at = now();

create or replace function public.retention_execute_cleanup(
  p_source_run_id uuid,
  p_executed_by_user_id uuid,
  p_executed_by_email text
)
returns table (
  cleanup_run_id uuid,
  deleted_total bigint,
  cleanup_report jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.data_retention_runs%rowtype;
  v_latest_dry_run_id uuid;
  v_existing_cleanup_id uuid;
  v_lock_acquired boolean;

  v_customer_conversation_cutoff timestamptz;
  v_customer_lead_cutoff timestamptz;
  v_support_cutoff timestamptz;
  v_sales_cutoff timestamptz;

  v_source_fingerprint jsonb;
  v_current_fingerprint jsonb;
  v_cleanup_report jsonb;
  v_cleanup_run_id uuid;

  v_expected_customer_conversations bigint := 0;
  v_expected_customer_leads bigint := 0;
  v_expected_support bigint := 0;
  v_expected_sales_leads bigint := 0;
  v_expected_sales_conversations bigint := 0;

  v_deleted_customer_conversations bigint := 0;
  v_deleted_customer_leads bigint := 0;
  v_deleted_support bigint := 0;
  v_deleted_sales_leads bigint := 0;
  v_deleted_sales_conversations bigint := 0;
  v_deleted_total bigint := 0;
begin
  -- One cleanup transaction at a time, even if two admins submit simultaneously.
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext('momo_retention_cleanup'));
  if not v_lock_acquired then
    raise exception 'RETENTION_CLEANUP_ALREADY_RUNNING';
  end if;

  select *
  into v_source
  from public.data_retention_runs
  where id = p_source_run_id
  for update;

  if not found or v_source.mode <> 'dry_run' or v_source.status <> 'completed' then
    raise exception 'RETENTION_SOURCE_INVALID';
  end if;

  if now() - v_source.created_at > interval '15 minutes' then
    raise exception 'RETENTION_SOURCE_STALE';
  end if;

  select id
  into v_latest_dry_run_id
  from public.data_retention_runs
  where mode = 'dry_run'
    and status = 'completed'
    and trigger_source = v_source.trigger_source
  order by created_at desc
  limit 1;

  if v_latest_dry_run_id is distinct from p_source_run_id then
    raise exception 'RETENTION_SOURCE_NOT_LATEST';
  end if;

  select id
  into v_existing_cleanup_id
  from public.data_retention_runs
  where mode = 'cleanup'
    and status = 'completed'
    and source_run_id = p_source_run_id
  limit 1;

  if v_existing_cleanup_id is not null then
    raise exception 'RETENTION_SOURCE_ALREADY_CLEANED';
  end if;

  begin
    v_customer_conversation_cutoff := nullif(v_source.policy_snapshot #>> '{cutoffs,customer_conversation_cutoff}', '')::timestamptz;
    v_customer_lead_cutoff := nullif(v_source.policy_snapshot #>> '{cutoffs,customer_lead_cutoff}', '')::timestamptz;
    v_support_cutoff := nullif(v_source.policy_snapshot #>> '{cutoffs,support_cutoff}', '')::timestamptz;
    v_sales_cutoff := nullif(v_source.policy_snapshot #>> '{cutoffs,sales_cutoff}', '')::timestamptz;
  exception when others then
    raise exception 'RETENTION_SOURCE_MISSING_CUTOFFS';
  end;

  if v_customer_conversation_cutoff is null
     or v_customer_lead_cutoff is null
     or v_support_cutoff is null
     or v_sales_cutoff is null then
    raise exception 'RETENTION_SOURCE_MISSING_CUTOFFS';
  end if;

  -- Compare only the identity + count fingerprint. Reasons/text are deliberately
  -- excluded so wording changes do not invalidate a valid analysis.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'scope_type', element ->> 'scope_type',
        'organization_id', element -> 'organization_id',
        'category', element ->> 'category',
        'eligible_count', (element ->> 'eligible_count')::bigint
      )
      order by
        element ->> 'scope_type',
        coalesce(element ->> 'organization_id', ''),
        element ->> 'category'
    ),
    '[]'::jsonb
  )
  into v_source_fingerprint
  from jsonb_array_elements(v_source.report) as source_rows(element);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'scope_type', current_row.scope_type,
        'organization_id', to_jsonb(current_row.organization_id),
        'category', current_row.category,
        'eligible_count', current_row.eligible_count
      )
      order by
        current_row.scope_type,
        coalesce(current_row.organization_id::text, ''),
        current_row.category
    ),
    '[]'::jsonb
  )
  into v_current_fingerprint
  from public.retention_dry_run_report(
    v_customer_conversation_cutoff,
    v_customer_lead_cutoff,
    v_support_cutoff,
    v_sales_cutoff
  ) current_row;

  if v_current_fingerprint is distinct from v_source_fingerprint then
    raise exception 'RETENTION_SOURCE_CHANGED';
  end if;

  select
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'customer_conversations'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'customer_leads'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'resolved_support_tickets'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'dormant_sales_leads'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'dormant_sales_conversations'), 0)
  into
    v_expected_customer_conversations,
    v_expected_customer_leads,
    v_expected_support,
    v_expected_sales_leads,
    v_expected_sales_conversations
  from jsonb_array_elements(v_source.report) as source_rows(element);

  -- Materialise the exact eligible primary-row IDs before deleting anything.
  -- This prevents dependency changes caused by earlier deletes from broadening a
  -- later delete inside the same cleanup transaction.
  create temp table retention_customer_leads_ids on commit drop as
  select l.id
  from public.leads l
  where l.source = 'widget'
    and l.organization_id is not null
    and exists (select 1 from public.organizations o where o.id = l.organization_id)
    and coalesce(l.updated_at, l.created_at) < v_customer_lead_cutoff;

  create temp table retention_sales_leads_ids on commit drop as
  select l.id
  from public.leads l
  where l.source = 'momo_sales'
    and l.organization_id is null
    and l.converted_organization_id is null
    and l.status in ('new', 'contacted')
    and coalesce(l.updated_at, l.created_at) < v_sales_cutoff;

  create temp table retention_support_ticket_ids on commit drop as
  select t.id
  from public.support_tickets t
  where t.status = 'resolved'
    and exists (select 1 from public.organizations o where o.id = t.organization_id)
    and coalesce(t.resolved_at, t.updated_at) < v_support_cutoff;

  create temp table retention_customer_conversation_ids on commit drop as
  select c.id
  from public.conversations c
  where c.source = 'widget'
    and c.organization_id is not null
    and exists (select 1 from public.organizations o where o.id = c.organization_id)
    and c.updated_at < v_customer_conversation_cutoff
    and not exists (
      select 1
      from public.leads linked_lead
      where linked_lead.conversation_id = c.id
        and not (
          linked_lead.source = 'widget'
          and linked_lead.organization_id = c.organization_id
          and coalesce(linked_lead.updated_at, linked_lead.created_at) < v_customer_lead_cutoff
        )
    );

  create temp table retention_sales_conversation_ids on commit drop as
  select c.id
  from public.conversations c
  where c.source = 'momo_sales'
    and c.organization_id is null
    and c.updated_at < v_sales_cutoff
    and not exists (
      select 1
      from public.leads linked_lead
      where linked_lead.conversation_id = c.id
        and not (
          linked_lead.source = 'momo_sales'
          and linked_lead.organization_id is null
          and linked_lead.converted_organization_id is null
          and linked_lead.status in ('new', 'contacted')
          and coalesce(linked_lead.updated_at, linked_lead.created_at) < v_sales_cutoff
        )
    );

  -- Delete eligible leads before conversations. Conversation IDs are already
  -- frozen above, so the target set cannot broaden after the lead deletes.
  delete from public.leads l
  using retention_customer_leads_ids target
  where l.id = target.id;
  get diagnostics v_deleted_customer_leads = row_count;

  delete from public.leads l
  using retention_sales_leads_ids target
  where l.id = target.id;
  get diagnostics v_deleted_sales_leads = row_count;

  delete from public.support_tickets t
  using retention_support_ticket_ids target
  where t.id = target.id;
  get diagnostics v_deleted_support = row_count;

  -- Remove child messages explicitly before their parent conversations.
  delete from public.messages m
  using retention_customer_conversation_ids target
  where m.conversation_id = target.id;

  delete from public.conversations c
  using retention_customer_conversation_ids target
  where c.id = target.id;
  get diagnostics v_deleted_customer_conversations = row_count;

  delete from public.messages m
  using retention_sales_conversation_ids target
  where m.conversation_id = target.id;

  delete from public.conversations c
  using retention_sales_conversation_ids target
  where c.id = target.id;
  get diagnostics v_deleted_sales_conversations = row_count;

  -- If any primary-category count differs from the approved dry-run, abort the
  -- transaction. PostgreSQL will roll back every deletion above.
  if v_deleted_customer_conversations <> v_expected_customer_conversations
     or v_deleted_customer_leads <> v_expected_customer_leads
     or v_deleted_support <> v_expected_support
     or v_deleted_sales_leads <> v_expected_sales_leads
     or v_deleted_sales_conversations <> v_expected_sales_conversations then
    raise exception 'RETENTION_DELETE_COUNT_MISMATCH';
  end if;

  v_deleted_total :=
      v_deleted_customer_conversations
    + v_deleted_customer_leads
    + v_deleted_support
    + v_deleted_sales_leads
    + v_deleted_sales_conversations;

  if v_deleted_total <> v_source.eligible_total then
    raise exception 'RETENTION_DELETE_TOTAL_MISMATCH';
  end if;

  select coalesce(
    jsonb_agg(
      element || jsonb_build_object('deleted_count', (element ->> 'eligible_count')::bigint)
      order by
        element ->> 'scope_type',
        coalesce(element ->> 'organization_id', ''),
        element ->> 'category'
    ),
    '[]'::jsonb
  )
  into v_cleanup_report
  from jsonb_array_elements(v_source.report) as source_rows(element);

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
    deleted_total
  ) values (
    'cleanup',
    v_source.trigger_source,
    p_source_run_id,
    'completed',
    p_executed_by_user_id,
    p_executed_by_email,
    v_source.policy_version,
    v_source.policy_snapshot,
    v_cleanup_report,
    v_source.eligible_total,
    v_deleted_total
  )
  returning id into v_cleanup_run_id;

  return query
  select v_cleanup_run_id, v_deleted_total, v_cleanup_report;
end;
$$;

revoke all on function public.retention_execute_cleanup(uuid, uuid, text) from public;
grant execute on function public.retention_execute_cleanup(uuid, uuid, text) to service_role;

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
        'post_termination_days', 30,
        'security_data_days', 90,
        'cutoffs', jsonb_build_object(
          'customer_conversation_cutoff', v_customer_conversation_cutoff,
          'customer_lead_cutoff', v_customer_lead_cutoff,
          'support_cutoff', v_support_cutoff,
          'sales_cutoff', v_sales_cutoff
        ),
        'exclusions', jsonb_build_array(
          'post_termination_cleanup',
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

-- Supabase Cron / pg_cron. The database-side product flag remains disabled until
-- an admin explicitly enables automatic retention in the Momo Admin UI.
create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'momo-retention-daily'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'momo-retention-daily',
    '15 3 * * *',
    $cron$select public.retention_run_automatic_cycle();$cron$
  );
end;
$$;
