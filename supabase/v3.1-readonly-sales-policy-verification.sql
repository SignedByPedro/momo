-- Momo v3.1 - read-only verification
select
  exists (
    select 1 from public.knowledge_entries
    where agent_key='momo-sales' and slug='failed-payment-grace-period'
      and status='published' and visibility='public'
      and content ilike '%7 dias%'
  ) as sales_failed_payment_grace_period,
  exists (
    select 1 from public.knowledge_entries
    where agent_key='momo-sales' and slug='payment-reactivation'
      and content ilike '%automaticamente%'
  ) as sales_automatic_reactivation,
  exists (
    select 1 from public.knowledge_entries
    where agent_key='momo-sales' and slug='no-commitment-recommendation'
      and content ilike '%três meses%'
  ) as sales_three_month_recommendation,
  exists (
    select 1 from public.knowledge_entries
    where agent_key='momo-sales' and slug='no-prorated-refund'
      and content ilike '%não existe reembolso proporcional%'
      and content not ilike '%obrigação legal%'
  ) as sales_clean_refund_wording,
  exists (
    select 1 from public.knowledge_entries
    where agent_key='momo-support' and slug='momo-support-billing-failed-payments'
      and content ilike '%reactivated automatically%'
  ) as support_automatic_reactivation;
