-- Momo v2.33 - READ ONLY knowledge verification
-- Run AFTER:
-- 1) v2.33-knowledge-foundation.sql
-- 2) Admin -> Conhecimento do Momo -> Reindexar conhecimento
-- 3) Admin -> Support -> Knowledge Base -> Reindexar documentação

select
  (select count(*) from public.knowledge_entries where agent_key = 'momo-sales' and visibility = 'public' and status = 'published') >= 14 as sales_public_entries_ok,
  (select count(*) from public.knowledge_entries where agent_key = 'momo-support' and visibility = 'public' and status = 'published') >= 19 as support_public_entries_ok,
  not exists (
    select 1 from public.knowledge_entries
    where agent_key in ('momo-sales','momo-support')
      and visibility = 'public'
      and status = 'published'
      and embedding is null
  ) as all_public_entries_indexed,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-sales'
      and slug = 'supported-languages'
      and content ilike '%plano base%'
      and content ilike '%custo adicional%'
  ) as sales_language_model_current,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-primary-language'
      and content ilike '%cannot be edited directly%'
  ) as support_primary_language_current,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-tickets'
      and content ilike '%mark a ticket as resolved%'
      and content ilike '%unread alert%'
  ) as support_ticket_docs_current,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-account-self-deletion'
      and content ilike '%last active Owner%'
  ) as support_self_delete_current,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-widget-installation'
      and content ilike '%390 x 570%'
      and content ilike '%520 x 760%'
  ) as support_widget_size_current,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-account-cancellation-recovery'
      and embedding is not null
  ) as cancellation_recovery_indexed;
