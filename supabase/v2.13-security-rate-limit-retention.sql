-- Momo v2.13 — Technical rate-limit retention (48h since last update)
-- Apply AFTER v2.12. Reuses the guarded manual/automatic retention engine.
-- No immediate data deletion, cron creation, cron toggling or organisation purge.
-- Production already has api_rate_limits and consume_api_rate_limit; the DDL
-- below versions them without resetting counters, changing RLS or grants.
-- All cleanup runs remain opt-in for manual, and follow the existing automation
-- switch for daily cron. Apply during a quiet maintenance window: v2.12 admin
-- dry-runs intentionally cannot be used for cleanup after this migration.

-- Apply all function replacements and metadata together, or none at all.
begin;

-- Fail safely if an existing table differs from the confirmed production
-- layout; never try to coerce, drop or recreate existing counter data.
do $v213_preflight$
begin
  if to_regclass('public.api_rate_limits') is not null and (
    select count(*)
    from pg_attribute a
    where a.attrelid = 'public.api_rate_limits'::regclass
      and a.attnum > 0 and not a.attisdropped
      and a.attnotnull
      and (
        (a.attname = 'rate_key' and a.atttypid = 'text'::regtype)
        or (a.attname = 'window_started_at' and a.atttypid = 'timestamptz'::regtype)
        or (a.attname = 'request_count' and a.atttypid = 'integer'::regtype)
        or (a.attname = 'updated_at' and a.atttypid = 'timestamptz'::regtype)
      )
  ) <> 4 then
    raise exception 'V213_RATE_LIMIT_SCHEMA_MISMATCH';
  end if;
end;
$v213_preflight$;

-- Version the production schema without dropping the existing table/index or
-- changing access policies. The existing rate-limit data is left untouched.
create table if not exists public.api_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists api_rate_limits_updated_at_idx
  on public.api_rate_limits (updated_at);

-- Exact production counter semantics (no changes to grants or RLS). On an
-- existing function CREATE OR REPLACE preserves its existing privileges.
create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_window_started_at timestamptz;
  v_request_count integer;
  v_retry_after integer;
begin
  if p_key is null or length(p_key) < 1 or length(p_key) > 240 then
    raise exception 'invalid rate-limit key';
  end if;

  if p_limit < 1 or p_limit > 10000 then
    raise exception 'invalid rate-limit limit';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit window';
  end if;

  insert into public.api_rate_limits (
    rate_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_key, v_now, 1, v_now)
  on conflict (rate_key) do update
  set
    window_started_at = case
      when public.api_rate_limits.window_started_at <=
           v_now - make_interval(secs => p_window_seconds)
      then v_now
      else public.api_rate_limits.window_started_at
    end,
    request_count = case
      when public.api_rate_limits.window_started_at <=
           v_now - make_interval(secs => p_window_seconds)
      then 1
      else public.api_rate_limits.request_count + 1
    end,
    updated_at = v_now
  returning window_started_at, request_count
  into v_window_started_at, v_request_count;

  v_retry_after := greatest(
    1,
    ceil(
      extract(
        epoch from (
          v_window_started_at +
          make_interval(secs => p_window_seconds) -
          v_now
        )
      )
    )::integer
  );

  return jsonb_build_object(
    'allowed', v_request_count <= p_limit,
    'remaining', greatest(0, p_limit - v_request_count),
    'retry_after_seconds',
    case
      when v_request_count <= p_limit then 0
      else v_retry_after
    end
  );
end;
$function$;

-- New 5-argument report overload keeps the v2.12 4-argument RPC intact. All
-- v2.13 call sites supply a fixed snapshot cutoff so revalidation/del is stable.
-- The output contains only category/scope/count/cutoff/reason, not rate keys.
create or replace function public.retention_dry_run_report(
  p_customer_conversation_cutoff timestamptz,
  p_customer_lead_cutoff timestamptz,
  p_support_cutoff timestamptz,
  p_sales_cutoff timestamptz,
  p_rate_limit_cutoff timestamptz
)
returns table (
  scope_type text,
  organization_id uuid,
  organization_name text,
  category text,
  eligible_count bigint,
  cutoff_at timestamptz,
  reason text
)
language sql
stable
security definer
set search_path = public
as $$
  with report_rows as (
    select
      'organization'::text as scope_type,
      o.id as organization_id,
      o.name as organization_name,
      'customer_conversations'::text as category,
      count(c.id)::bigint as eligible_count,
      p_customer_conversation_cutoff as cutoff_at,
      'Widget conversations older than the configured retention window and not required by a retained linked lead.'::text as reason
    from public.organizations o
    join public.conversations c
      on c.organization_id = o.id
     and c.source = 'widget'
     and c.updated_at < p_customer_conversation_cutoff
     and not exists (
       select 1
       from public.leads linked_lead
       where linked_lead.conversation_id = c.id
         and not (
           linked_lead.source = 'widget'
           and linked_lead.organization_id = c.organization_id
           and coalesce(linked_lead.updated_at, linked_lead.created_at) < p_customer_lead_cutoff
         )
     )
    group by o.id, o.name

    union all

    select
      'organization'::text,
      o.id,
      o.name,
      'customer_leads'::text,
      count(l.id)::bigint,
      p_customer_lead_cutoff,
      'Widget leads whose latest recorded activity is older than the configured retention window.'::text
    from public.organizations o
    join public.leads l
      on l.organization_id = o.id
     and l.source = 'widget'
     and coalesce(l.updated_at, l.created_at) < p_customer_lead_cutoff
    group by o.id, o.name

    union all

    select
      'organization'::text,
      o.id,
      o.name,
      'resolved_support_tickets'::text,
      count(t.id)::bigint,
      p_support_cutoff,
      'Resolved support tickets older than the configured post-resolution retention window.'::text
    from public.organizations o
    join public.support_tickets t
      on t.organization_id = o.id
     and t.status = 'resolved'
     and coalesce(t.resolved_at, t.updated_at) < p_support_cutoff
    group by o.id, o.name

    union all

    select
      'momo'::text,
      null::uuid,
      'Momo'::text,
      'dormant_sales_leads'::text,
      count(l.id)::bigint,
      p_sales_cutoff,
      'Unconverted Momo sales leads with no recorded activity inside the configured commercial retention window.'::text
    from public.leads l
    where l.source = 'momo_sales'
      and l.organization_id is null
      and l.converted_organization_id is null
      and l.status in ('new', 'contacted')
      and coalesce(l.updated_at, l.created_at) < p_sales_cutoff
    having count(l.id) > 0

    union all

    select
      'momo'::text,
      null::uuid,
      'Momo'::text,
      'dormant_sales_conversations'::text,
      count(c.id)::bigint,
      p_sales_cutoff,
      'Old Momo sales conversations for which every linked lead is also eligible for dormant-sales cleanup.'::text
    from public.conversations c
    where c.source = 'momo_sales'
      and c.organization_id is null
      and c.updated_at < p_sales_cutoff
      and not exists (
        select 1
        from public.leads linked_lead
        where linked_lead.conversation_id = c.id
          and not (
            linked_lead.source = 'momo_sales'
            and linked_lead.organization_id is null
            and linked_lead.converted_organization_id is null
            and linked_lead.status in ('new', 'contacted')
            and coalesce(linked_lead.updated_at, linked_lead.created_at) < p_sales_cutoff
          )
      )
    having count(c.id) > 0

    union all

    -- Platform-wide temporary counters, never individual keys or IPs in audit.
    select
      'momo'::text,
      null::uuid,
      'Momo'::text,
      'api_rate_limits'::text,
      count(r.rate_key)::bigint,
      p_rate_limit_cutoff,
      'Technical rate-limit counters inactive for more than 48 hours.'::text
    from public.api_rate_limits r
    where r.updated_at < p_rate_limit_cutoff
    having count(r.rate_key) > 0
  )
  select
    r.scope_type,
    r.organization_id,
    r.organization_name,
    r.category,
    r.eligible_count,
    r.cutoff_at,
    r.reason
  from report_rows r
  where r.eligible_count > 0
  order by r.organization_name asc, r.category asc;
$$;

-- This new overload is service-only; previous 4-argument grants stay intact.
revoke all on function public.retention_dry_run_report(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.retention_dry_run_report(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.retention_dry_run_report(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) to service_role;

-- Replace the SAME cleanup RPC, preserving existing permission grants and all
-- v2.10/v2.11 controls. New 48h rows are locked and deleted in one transaction.
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
  v_rate_limit_cutoff timestamptz;

  v_source_fingerprint jsonb;
  v_current_fingerprint jsonb;
  v_cleanup_report jsonb;
  v_cleanup_run_id uuid;

  v_expected_customer_conversations bigint := 0;
  v_expected_customer_leads bigint := 0;
  v_expected_support bigint := 0;
  v_expected_sales_leads bigint := 0;
  v_expected_sales_conversations bigint := 0;
  v_expected_rate_limits bigint := 0;

  v_deleted_customer_conversations bigint := 0;
  v_deleted_customer_leads bigint := 0;
  v_deleted_support bigint := 0;
  v_deleted_sales_leads bigint := 0;
  v_deleted_sales_conversations bigint := 0;
  v_deleted_rate_limits bigint := 0;
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
    v_rate_limit_cutoff := nullif(v_source.policy_snapshot #>> '{cutoffs,rate_limit_cutoff}', '')::timestamptz;
  exception when others then
    raise exception 'RETENTION_SOURCE_MISSING_CUTOFFS';
  end;

  if v_customer_conversation_cutoff is null
     or v_customer_lead_cutoff is null
     or v_support_cutoff is null
     or v_sales_cutoff is null
     or v_rate_limit_cutoff is null
     or v_source.policy_snapshot ->> 'rate_limit_hours' is distinct from '48' then
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
    v_sales_cutoff,
    v_rate_limit_cutoff
  ) current_row;

  if v_current_fingerprint is distinct from v_source_fingerprint then
    raise exception 'RETENTION_SOURCE_CHANGED';
  end if;

  select
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'customer_conversations'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'customer_leads'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'resolved_support_tickets'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'dormant_sales_leads'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'dormant_sales_conversations'), 0),
    coalesce(sum((element ->> 'eligible_count')::bigint) filter (where element ->> 'category' = 'api_rate_limits'), 0)
  into
    v_expected_customer_conversations,
    v_expected_customer_leads,
    v_expected_support,
    v_expected_sales_leads,
    v_expected_sales_conversations,
    v_expected_rate_limits
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

  -- Lock the precise technical counter rows so requests which refreshed a
  -- counter after the dry-run cannot lose that actively-used record in cleanup.
  -- Keys exist ONLY inside this transaction-local temp table; audit stores counts.
  create temp table retention_rate_limit_ids (
    rate_key text primary key
  ) on commit drop;

  insert into retention_rate_limit_ids (rate_key)
  select r.rate_key
  from public.api_rate_limits r
  where r.updated_at < v_rate_limit_cutoff
  for update of r;

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

  delete from public.api_rate_limits r
  using retention_rate_limit_ids target
  where r.rate_key = target.rate_key
    and r.updated_at < v_rate_limit_cutoff;
  get diagnostics v_deleted_rate_limits = row_count;

  -- If any primary-category count differs from the approved dry-run, abort the
  -- transaction. PostgreSQL will roll back every deletion above.
  if v_deleted_customer_conversations <> v_expected_customer_conversations
     or v_deleted_customer_leads <> v_expected_customer_leads
     or v_deleted_support <> v_expected_support
     or v_deleted_sales_leads <> v_expected_sales_leads
     or v_deleted_sales_conversations <> v_expected_sales_conversations
     or v_deleted_rate_limits <> v_expected_rate_limits then
    raise exception 'RETENTION_DELETE_COUNT_MISMATCH';
  end if;

  v_deleted_total :=
      v_deleted_customer_conversations
    + v_deleted_customer_leads
    + v_deleted_support
    + v_deleted_sales_leads
    + v_deleted_sales_conversations
    + v_deleted_rate_limits;

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

-- Preserve the existing automation switch and cron: only the policy metadata
-- changes, never enabled/schedule/last-run state or the cron job itself.
update public.data_retention_automation
set policy_version = '0.7', updated_at = now()
where id = 1;

-- Replace the existing v2.12 cycle; it calls the new report overload, and
-- relies on retention_execute_cleanup for both old and new categories.
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
  v_rate_limit_cutoff timestamptz;
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
    v_rate_limit_cutoff := v_now - interval '48 hours';

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
      v_sales_cutoff,
      v_rate_limit_cutoff
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
        'rate_limit_hours', 48,
        'cutoffs', jsonb_build_object(
          'customer_conversation_cutoff', v_customer_conversation_cutoff,
          'customer_lead_cutoff', v_customer_lead_cutoff,
          'support_cutoff', v_support_cutoff,
          'sales_cutoff', v_sales_cutoff,
          'rate_limit_cutoff', v_rate_limit_cutoff
        ),
        'exclusions', jsonb_build_array('post_termination_final_purge'),
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

-- Expose the new RPC to PostgREST after migration, without changing settings.
notify pgrst, 'reload schema';

commit;
