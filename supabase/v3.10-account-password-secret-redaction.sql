-- Momo v3.10 - Account password change knowledge + Support secret handling
-- Run after applying the v3.10 code. Reindex Momo Support afterwards.

begin;

insert into public.knowledge_entries (
  slug,
  agent_key,
  category,
  title,
  content,
  visibility,
  status,
  organization_id,
  updated_at
) values (
  'momo-support-account-password-change',
  'momo-support',
  'Account & Security',
  'Changing a Portal account password',
  'Both Owners and Members can change the password of their own authenticated Portal account from My account. The user must enter the current password, choose a new password with at least 8 characters and confirm the new password. An Owner cannot change a Member''s password and a Member cannot change anyone else''s password. If unauthorized access is suspected, advise the user to change their own password immediately and escalate the security concern with high priority. Never ask the user to send a password, token, API key or another credential through Support.',
  'public',
  'published',
  null,
  now()
)
on conflict (slug) do update set
  agent_key = excluded.agent_key,
  category = excluded.category,
  title = excluded.title,
  content = excluded.content,
  visibility = excluded.visibility,
  status = excluded.status,
  organization_id = excluded.organization_id,
  updated_at = excluded.updated_at;

update public.knowledge_entries
set
  content = 'Momo uses individual authenticated accounts and organization-based permissions. Owners and Members have different access levels. Both Owners and Members can change the password of their own Portal account from My account, but cannot change another user''s password. Suspected unauthorized access, data exposure or serious security concerns require high-priority escalation. When unauthorized access is suspected, advise the user to change their own password immediately and never ask them to send credentials through Support. Do not describe the security model with guarantees that are not documented. Maintenance, updates and occasional outages can occur, including failures in external services Momo depends on. Momo does not currently promise 100% uptime or a fixed technical availability SLA.',
  updated_at = now()
where slug = 'momo-support-security-availability'
  and agent_key = 'momo-support';

update public.knowledge_entries
set
  content = 'Use high priority for security concerns, suspected unauthorized access or data exposure, verified privacy deletion requests, and critical complete service outages. Use normal priority for technical investigation, account-specific billing/payment help, ownership/access changes, primary-language requests and confirmed integration evaluations. Use low priority for confirmed feature suggestions and other non-urgent requests. Priority is internal triage and never a response-time promise. Ticket summaries and saved conversation context must never intentionally include passwords, API keys, access tokens or other credentials. If the client shares a credential, warn them not to send credentials through Support and advise changing or revoking it when appropriate. The application also redacts recognizable secrets before ticket content is persisted.',
  updated_at = now()
where slug = 'momo-support-ticket-priorities'
  and agent_key = 'momo-support';

-- One-time cleanup for obvious labelled password values that may already have
-- been stored in historical Support ticket text before server-side redaction
-- existed. This intentionally targets password-labelled values only.
update public.support_ticket_messages
set content = regexp_replace(
  content,
  '(password|passwd|pwd|senha|palavra[- ]passe)[[:space:]]*(=|:|->|é|e|is)[[:space:]]*[^[:space:],;.!?]+',
  '\1 \2 [REDACTED]',
  'gi'
)
where content ~* '(password|passwd|pwd|senha|palavra[- ]passe)[[:space:]]*(=|:|->|é|e|is)[[:space:]]*[^[:space:],;.!?]+';

update public.support_tickets
set ai_summary = regexp_replace(
  ai_summary,
  '(password|passwd|pwd|senha|palavra[- ]passe)[[:space:]]*(=|:|->|é|e|is)[[:space:]]*[^[:space:],;.!?]+',
  '\1 \2 [REDACTED]',
  'gi'
)
where ai_summary is not null
  and ai_summary ~* '(password|passwd|pwd|senha|palavra[- ]passe)[[:space:]]*(=|:|->|é|e|is)[[:space:]]*[^[:space:],;.!?]+';

update public.support_tickets as ticket
set context_snapshot = cleaned.context_snapshot
from (
  select
    t.id,
    coalesce(
      jsonb_agg(
        case
          when item ? 'content' then jsonb_set(
            item,
            '{content}',
            to_jsonb(regexp_replace(
              item->>'content',
              '(password|passwd|pwd|senha|palavra[- ]passe)[[:space:]]*(=|:|->|é|e|is)[[:space:]]*[^[:space:],;.!?]+',
              '\1 \2 [REDACTED]',
              'gi'
            ))
          )
          else item
        end
        order by ordinal
      ),
      '[]'::jsonb
    ) as context_snapshot
  from public.support_tickets as t
  cross join lateral jsonb_array_elements(t.context_snapshot) with ordinality as elements(item, ordinal)
  where t.context_snapshot::text ~* '(password|passwd|pwd|senha|palavra[- ]passe)[[:space:]]*(=|:|->|é|e|is)[[:space:]]*[^[:space:],;.!?]+'
  group by t.id
) as cleaned
where ticket.id = cleaned.id;

commit;
