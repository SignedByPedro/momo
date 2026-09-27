-- Momo v2.9 — Data-retention dry-run engine
-- Safe phase: this migration does NOT delete any customer or visitor data.
-- It adds an admin-only audit table plus a read-only RPC that reports records
-- that would be eligible under the current draft retention defaults.

create table if not exists public.data_retention_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'dry_run' check (mode in ('dry_run')),
  executed_by_user_id uuid,
  executed_by_email text not null,
  policy_version text not null,
  policy_snapshot jsonb not null default '{}'::jsonb,
  report jsonb not null default '[]'::jsonb,
  eligible_total bigint not null default 0 check (eligible_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists data_retention_runs_created_idx
  on public.data_retention_runs (created_at desc);

alter table public.data_retention_runs enable row level security;
-- No anon/authenticated policies are intentionally added. The admin UI uses
-- the service-role server client after requireAdmin().

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
      'Widget conversations whose last recorded activity is older than the configured retention window.'::text as reason
    from public.organizations o
    join public.conversations c
      on c.organization_id = o.id
     and c.source = 'widget'
     and c.updated_at < p_customer_conversation_cutoff
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
      'Old Momo sales conversations not linked to a converted/won lead.'::text
    from public.conversations c
    where c.source = 'momo_sales'
      and c.organization_id is null
      and c.updated_at < p_sales_cutoff
      and not exists (
        select 1
        from public.leads l
        where l.conversation_id = c.id
          and l.source = 'momo_sales'
          and (l.converted_organization_id is not null or l.status = 'won')
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
