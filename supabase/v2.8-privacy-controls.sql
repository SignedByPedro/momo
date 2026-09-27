-- Momo v2.8 — Portal privacy controls documentation
-- Run after v2.7.1-support-hardening.sql, then reindex the Momo Support Knowledge Base.

insert into public.knowledge_entries (slug, agent_key, category, title, content, visibility, status)
select
  'momo-support-data-privacy-controls',
  'momo-support',
  'Privacy & Data',
  'Data export and deletion requests',
  'Organisation owners can manage privacy-related data controls from the Company area of the client portal. The Export data action downloads a JSON copy of organisation operational data, including organisation/team information, agent and widget configuration, Knowledge Base entries, conversations and messages, leads, and support history. The deletion control does not erase the account immediately: after the owner types the organisation name to confirm, Momo creates a high-priority privacy support ticket for manual verification. The team should verify identity, allow any needed export, review legal or contractual retention obligations, and only then perform destructive deletion. Do not tell a client that clicking the request button instantly deletes data.',
  'public',
  'published'
where not exists (
  select 1
  from public.knowledge_entries
  where agent_key = 'momo-support'
    and slug = 'momo-support-data-privacy-controls'
);

update public.knowledge_entries
set
  category = 'Privacy & Data',
  title = 'Data export and deletion requests',
  content = 'Organisation owners can manage privacy-related data controls from the Company area of the client portal. The Export data action downloads a JSON copy of organisation operational data, including organisation/team information, agent and widget configuration, Knowledge Base entries, conversations and messages, leads, and support history. The deletion control does not erase the account immediately: after the owner types the organisation name to confirm, Momo creates a high-priority privacy support ticket for manual verification. The team should verify identity, allow any needed export, review legal or contractual retention obligations, and only then perform destructive deletion. Do not tell a client that clicking the request button instantly deletes data.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-data-privacy-controls';
