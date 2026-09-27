-- Momo v3.8 - Support lead-retention clarification
--
-- Clarifies that asking whether a lost lead is deleted immediately is an
-- informational policy question. It does not by itself require a Support
-- ticket. Reindex Momo Support after applying this migration.

begin;

update public.knowledge_entries
set
  content = 'The current retention reference is up to 12 months from the last relevant activity for website conversations and 12 months after resolution for normal support tickets. Leads in new or contacted status are retained while commercially relevant. Once a lead is marked lost or converted to a customer, its personal lead data is no longer needed as a commercial lead and should be removed through the applicable process, while non-identifying aggregate metrics may remain. Marking a lead lost must not be described as a guaranteed immediate automatic deletion in that exact second unless current product behaviour explicitly confirms such a mechanism. A general question about this timing is an informational policy question and does not require a support ticket. Normal cancellation uses the separate 90-day organization recovery window after service ends. Explicit verified deletion requests are handled separately. Technical rate-limit counters use 48 hours, normal application logs have a 30-day reference period, and security-incident records may be retained for up to 12 months. Backup residues follow their normal expiry cycle.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-retention-policy';

update public.knowledge_entries
set
  content = 'Leads in new or contacted status are retained while commercially relevant. Once a lead is marked lost or converted to a customer, its personal lead data is no longer needed as a commercial lead and should be removed through the applicable process. Non-identifying aggregate metrics may remain. Do not claim that marking a lead lost causes guaranteed immediate automatic deletion in that exact second unless current product behaviour explicitly confirms that mechanism. If a user only asks whether the deletion is immediate or automatic, answer this policy directly and do not create a ticket. Escalate only if they explicitly request deletion now, report a concrete deletion problem that needs intervention, or another privacy issue requires team action.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-lead-retention';

insert into public.knowledge_entries
  (slug, agent_key, category, title, content, visibility, status, embedding, updated_at)
values
  (
    'momo-support-lost-lead-deletion-timing',
    'momo-support',
    'Privacy & Data',
    'Lost lead deletion timing / eliminação de lead perdida',
    'If a lead is marked lost, that status means its personal data is no longer needed for commercial follow-up and should be removed through the applicable data process. The approved product policy does not promise that the act of marking it lost automatically deletes the personal data in that exact second. Therefore questions such as "Is a lost lead deleted automatically immediately?" or "Se eu marcar uma lead como perdida, os dados são apagados automaticamente naquele segundo?" should be answered directly without opening a ticket. A ticket is appropriate only when the user actually requests deletion now, reports that a required deletion has failed, or needs team intervention for a concrete privacy case.',
    'public', 'published', null, now()
  )
on conflict (slug) do update set
  agent_key = excluded.agent_key,
  category = excluded.category,
  title = excluded.title,
  content = excluded.content,
  visibility = excluded.visibility,
  status = excluded.status,
  embedding = null,
  updated_at = now();

commit;
