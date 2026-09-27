-- Momo v2.10 — Controlled manual retention cleanup
-- Adds a destructive cleanup RPC with strict safeguards:
--   * only the latest completed dry-run can be used;
--   * the dry-run expires after 15 minutes;
--   * cleanup cannot be repeated for the same dry-run;
--   * the current eligible-data fingerprint must still match the dry-run;
--   * cleanup runs atomically inside one database transaction;
--   * only service_role may execute the cleanup RPC.

alter table public.data_retention_runs
  drop constraint if exists data_retention_runs_mode_check;

alter table public.data_retention_runs
  add constraint data_retention_runs_mode_check
  check (mode in ('dry_run', 'cleanup'));

alter table public.data_retention_runs
  add column if not exists source_run_id uuid references public.data_retention_runs(id) on delete set null,
  add column if not exists status text not null default 'completed',
  add column if not exists deleted_total bigint not null default 0,
  add column if not exists error_summary text;

alter table public.data_retention_runs
  drop constraint if exists data_retention_runs_status_check;

alter table public.data_retention_runs
  add constraint data_retention_runs_status_check
  check (status in ('completed', 'failed'));

alter table public.data_retention_runs
  drop constraint if exists data_retention_runs_deleted_total_check;

alter table public.data_retention_runs
  add constraint data_retention_runs_deleted_total_check
  check (deleted_total >= 0);

create index if not exists data_retention_runs_mode_created_idx
  on public.data_retention_runs (mode, created_at desc);

create unique index if not exists data_retention_runs_successful_cleanup_source_idx
  on public.data_retention_runs (source_run_id)
  where mode = 'cleanup' and status = 'completed' and source_run_id is not null;

-- Replace the dry-run report with dependency-safe conversation rules. A retained
-- lead is allowed to keep its linked conversation; a conversation is only
-- eligible when every linked lead is itself eligible for the same cleanup.
create or replace function public.retention_dry_run_report(
  p_customer_conversation_cutoff timestamptz,
  p_customer_lead_cutoff timestamptz,
  p_support_cutoff timestamptz,
  p_sales_cutoff timestamptz
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

revoke all on function public.retention_dry_run_report(timestamptz, timestamptz, timestamptz, timestamptz) from public;
grant execute on function public.retention_dry_run_report(timestamptz, timestamptz, timestamptz, timestamptz) to service_role;

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
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext('momo_retention_cleanup_v2_10'));
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
  where mode = 'dry_run' and status = 'completed'
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
