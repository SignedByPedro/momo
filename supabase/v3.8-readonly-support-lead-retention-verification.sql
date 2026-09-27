-- Momo v3.8 - read-only verification
select
  slug,
  agent_key,
  status,
  visibility,
  embedding is not null as indexed,
  title,
  content
from public.knowledge_entries
where agent_key = 'momo-support'
  and slug in (
    'momo-support-retention-policy',
    'momo-support-lead-retention',
    'momo-support-lost-lead-deletion-timing'
  )
order by slug;
