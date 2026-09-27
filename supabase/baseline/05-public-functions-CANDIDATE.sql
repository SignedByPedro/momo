-- Momo v2.15 / Public application functions, reproduced from exact-definition export.
-- ONLY on a NEW, EMPTY Supabase test project AFTER 01-04. NEVER on production.
-- NOTE: v2.15 export includes older retention ACLs that contradict the
-- confirmed v2.14a verification. This candidate deliberately REAPPLIES the
-- expected v2.14a hardening (service_role-only for all five signatures).
-- Supabase's default privileges for new functions can be broad: explicit
-- REVOKEs appear immediately after function creation, in ONE TRANSACTION.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.create_default_agent_config()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.agent_configs (
    organization_id,
    name,
    welcome_message,
    placeholder,
    supported_languages
  )
  values (
    new.id,
    'Momo',
    case when new.primary_language = 'en' then 'Hi! How can I help?' else 'Olá! Como posso ajudar?' end,
    case when new.primary_language = 'en' then 'Write a message...' else 'Escreve uma mensagem...' end,
    array[case when new.primary_language = 'en' then 'en' else 'pt' end]::text[]
  )
  on conflict (organization_id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_widget_config()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.widget_configs (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.match_client_knowledge(p_organization_id uuid, query_embedding vector, match_threshold double precision DEFAULT 0.34, match_count integer DEFAULT 6)
 RETURNS TABLE(id uuid, category text, title text, content text, source_type text, source_url text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select
    k.id,
    k.category,
    k.title,
    k.content,
    k.source_type,
    k.source_url,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_entries k
  where k.organization_id = p_organization_id
    and k.visibility = 'public'
    and k.status = 'published'
    and k.embedding is not null
    and 1 - (k.embedding <=> query_embedding) >= match_threshold
  order by k.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 12);
$function$;

CREATE OR REPLACE FUNCTION public.match_momo_knowledge(query_embedding vector, match_threshold double precision DEFAULT 0.34, match_count integer DEFAULT 6)
 RETURNS TABLE(id uuid, category text, title text, content text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select
    k.id,
    k.category,
    k.title,
    k.content,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_entries k
  where k.agent_key = 'momo-sales'
    and k.visibility = 'public'
    and k.status = 'published'
    and k.embedding is not null
    and 1 - (k.embedding <=> query_embedding) >= match_threshold
  order by k.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 12);
$function$;

CREATE OR REPLACE FUNCTION public.match_portal_support_knowledge(query_embedding vector, match_threshold double precision DEFAULT 0.34, match_count integer DEFAULT 6)
 RETURNS TABLE(id uuid, category text, title text, content text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select
    ke.id,
    ke.category,
    ke.title,
    ke.content,
    1 - (ke.embedding <=> query_embedding) as similarity
  from public.knowledge_entries ke
  where ke.agent_key = 'momo-support'
    and ke.visibility = 'public'
    and ke.status = 'published'
    and ke.embedding is not null
    and 1 - (ke.embedding <=> query_embedding) >= match_threshold
  order by ke.embedding <=> query_embedding
  limit greatest(1, least(match_count, 12));
$function$;

CREATE OR REPLACE FUNCTION public.retention_dry_run_report(p_customer_conversation_cutoff timestamp with time zone, p_customer_lead_cutoff timestamp with time zone, p_support_cutoff timestamp with time zone, p_sales_cutoff timestamp with time zone)
 RETURNS TABLE(scope_type text, organization_id uuid, organization_name text, category text, eligible_count bigint, cutoff_at timestamp with time zone, reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.retention_dry_run_report(p_customer_conversation_cutoff timestamp with time zone, p_customer_lead_cutoff timestamp with time zone, p_support_cutoff timestamp with time zone, p_sales_cutoff timestamp with time zone, p_rate_limit_cutoff timestamp with time zone)
 RETURNS TABLE(scope_type text, organization_id uuid, organization_name text, category text, eligible_count bigint, cutoff_at timestamp with time zone, reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.retention_execute_cleanup(p_source_run_id uuid, p_executed_by_user_id uuid, p_executed_by_email text)
 RETURNS TABLE(cleanup_run_id uuid, deleted_total bigint, cleanup_report jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.retention_mark_terminated_clients_due()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.retention_run_automatic_cycle()
 RETURNS TABLE(cycle_status text, dry_run_id uuid, cleanup_run_id uuid, eligible_total bigint, deleted_total bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Normalize function-specific ACLs for this NEW environment.
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text,integer,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.create_default_agent_config() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_default_agent_config() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_default_agent_config() TO anon, authenticated; -- Captured non-retention ACL
REVOKE ALL ON FUNCTION public.create_default_widget_config() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_default_widget_config() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_default_widget_config() TO anon, authenticated; -- Captured non-retention ACL
REVOKE ALL ON FUNCTION public.match_client_knowledge(uuid,extensions.vector,double precision,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_client_knowledge(uuid,extensions.vector,double precision,integer) TO service_role;
REVOKE ALL ON FUNCTION public.match_momo_knowledge(extensions.vector,double precision,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_momo_knowledge(extensions.vector,double precision,integer) TO service_role;
REVOKE ALL ON FUNCTION public.match_portal_support_knowledge(extensions.vector,double precision,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_portal_support_knowledge(extensions.vector,double precision,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_portal_support_knowledge(extensions.vector,double precision,integer) TO anon, authenticated; -- Captured non-retention ACL
REVOKE ALL ON FUNCTION public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.retention_execute_cleanup(uuid,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retention_execute_cleanup(uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.retention_mark_terminated_clients_due() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retention_mark_terminated_clients_due() TO service_role;
REVOKE ALL ON FUNCTION public.retention_run_automatic_cycle() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retention_run_automatic_cycle() TO service_role;

-- Verify the intended hardened permissions before COMMIT.
DO $verify_retention_acl$
DECLARE p record;
BEGIN
 FOR p IN
  SELECT 'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)'::text AS signature
  UNION ALL
  SELECT 'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)'::text AS signature
  UNION ALL
  SELECT 'public.retention_execute_cleanup(uuid,uuid,text)'::text AS signature
  UNION ALL
  SELECT 'public.retention_mark_terminated_clients_due()'::text AS signature
  UNION ALL
  SELECT 'public.retention_run_automatic_cycle()'::text AS signature
 LOOP
  IF to_regprocedure(p.signature) IS NULL THEN
    RAISE EXCEPTION 'V215_BASELINE_MISSING_RETENTION_FUNCTION: %',p.signature;
  END IF;
  IF NOT has_function_privilege('service_role',to_regprocedure(p.signature),'EXECUTE')
     OR has_function_privilege('anon',to_regprocedure(p.signature),'EXECUTE')
     OR has_function_privilege('authenticated',to_regprocedure(p.signature),'EXECUTE')
     THEN
    RAISE EXCEPTION 'V215_BASELINE_UNSAFE_RETENTION_ACL: %',p.signature;
  END IF;
 END LOOP;
END;
$verify_retention_acl$;
COMMIT;
