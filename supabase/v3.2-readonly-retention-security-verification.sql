-- Momo v3.2 - read-only verification
select
  exists(select 1 from public.knowledge_entries where slug = 'lead-retention-lifecycle' and agent_key = 'momo-sales' and status = 'published') as sales_lead_retention,
  exists(select 1 from public.knowledge_entries where slug = 'technical-log-retention' and agent_key = 'momo-sales' and status = 'published') as sales_log_retention,
  exists(select 1 from public.knowledge_entries where slug = 'security-incident-retention' and agent_key = 'momo-sales' and status = 'published') as sales_security_retention,
  exists(select 1 from public.knowledge_entries where slug = 'organization-data-access' and agent_key = 'momo-sales' and status = 'published') as sales_org_access,
  exists(select 1 from public.knowledge_entries where slug = 'service-availability-24-7' and agent_key = 'momo-sales' and status = 'published') as sales_availability,
  exists(select 1 from public.knowledge_entries where slug = 'momo-support-lead-retention' and agent_key = 'momo-support' and status = 'published') as support_lead_retention,
  exists(select 1 from public.knowledge_entries where slug = 'momo-support-log-retention' and agent_key = 'momo-support' and status = 'published') as support_log_retention,
  exists(select 1 from public.knowledge_entries where slug = 'momo-support-organization-data-access' and agent_key = 'momo-support' and status = 'published') as support_org_access,
  exists(select 1 from public.knowledge_entries where slug = 'momo-support-service-availability-24-7' and agent_key = 'momo-support' and status = 'published') as support_availability,
  exists(select 1 from public.knowledge_entries where slug = 'momo-support-billing-policy' and content ilike '%reactivated automatically%') as support_billing_v31_fix,
  exists(select 1 from public.knowledge_entries where slug = 'momo-support-cancellation-policy' and content ilike '%three months%') as support_cancellation_v31_fix;
