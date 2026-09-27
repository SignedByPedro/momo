-- Momo v2.34 - READ ONLY business-policy knowledge verification
-- Run AFTER:
-- 1) v2.33-knowledge-foundation.sql if it has not already been applied
-- 2) v2.34-business-policies-knowledge.sql
-- 3) reindex BOTH Momo Sales and Momo Support knowledge bases from Admin

select
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-sales'
      and slug = 'onboarding-timeline'
      and visibility = 'public'
      and status = 'published'
      and content ilike '%analisado caso a caso%'
  ) as sales_onboarding_case_by_case,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-sales'
      and slug = 'base-plan-scope'
      and content ilike '%um idioma principal%'
      and content ilike '%Portal%'
  ) as sales_base_scope_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-sales'
      and slug = 'billing-policy'
      and content ilike '%7 dias%'
      and content ilike '%Portal permanece acessível%'
  ) as sales_billing_policy_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-sales'
      and slug = 'cancellation-policy'
      and content ilike '%Não existe fidelização%'
      and content ilike '%90 dias%'
  ) as sales_cancellation_policy_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-sales'
      and slug = 'recommended-evaluation-period'
      and content ilike '%três meses%'
  ) as sales_three_month_recommendation_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-sales'
      and slug = 'advanced-capabilities-status'
      and content ilike '%não devem ser apresentadas como disponíveis%'
  ) as sales_no_future_feature_promise,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-onboarding'
      and content ilike '%case by case%'
      and content ilike '%script%'
  ) as support_onboarding_detail_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-billing-policy'
      and content ilike '%7-day grace period%'
  ) as support_billing_policy_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-retention-policy'
      and content ilike '%12 months%'
      and content ilike '%48-hour%'
  ) as support_retention_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-escalation'
      and content ilike '%should not create a ticket automatically%'
  ) as support_feature_integration_confirmation_rule,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-ticket-priorities'
      and content ilike '%high priority%'
      and content ilike '%low priority%'
  ) as support_ticket_priority_present,
  exists (
    select 1 from public.knowledge_entries
    where agent_key = 'momo-support'
      and slug = 'momo-support-knowledge-governance'
      and content ilike '%not currently confirmed%'
  ) as support_knowledge_evolves,
  not exists (
    select 1 from public.knowledge_entries
    where agent_key in ('momo-sales', 'momo-support')
      and visibility = 'public'
      and status = 'published'
      and embedding is null
  ) as all_public_entries_indexed;
