-- Momo v3.13 - READ ONLY Support secret verification
-- Does not modify rows.
-- Unlike the v3.12 check, this extracts the candidate value and excludes the
-- known masks themselves, so text after a mask cannot be mistaken for a secret.

with message_candidates as (
  select m.id, match[4] as candidate
  from public.support_ticket_messages m
  cross join lateral regexp_matches(
    m.content,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)([^[:space:],;.!?]+)',
    'gi'
  ) as match

  union all

  select m.id, match[3] as candidate
  from public.support_ticket_messages m
  cross join lateral regexp_matches(
    m.content,
    '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)([^[:space:],;.!?]+)',
    'gi'
  ) as match
),
unmasked_messages as (
  select distinct id
  from message_candidates
  where lower(candidate) not in ('[redacted]', '********')
),
ticket_texts as (
  select id, subject as content from public.support_tickets
  union all
  select id, coalesce(ai_summary, '') from public.support_tickets
  union all
  select t.id, item->>'content'
  from public.support_tickets t
  cross join lateral jsonb_array_elements(t.context_snapshot) as items(item)
  where item ? 'content'
),
ticket_candidates as (
  select t.id, match[4] as candidate
  from ticket_texts t
  cross join lateral regexp_matches(
    t.content,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)([^[:space:],;.!?]+)',
    'gi'
  ) as match

  union all

  select t.id, match[3] as candidate
  from ticket_texts t
  cross join lateral regexp_matches(
    t.content,
    '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)([^[:space:],;.!?]+)',
    'gi'
  ) as match
),
unmasked_ticket_metadata as (
  select distinct id
  from ticket_candidates
  where lower(candidate) not in ('[redacted]', '********')
)
select count(*) as support_messages_with_unredacted_recognizable_shorthand_secret
from unmasked_messages;

with ticket_texts as (
  select id, subject as content from public.support_tickets
  union all
  select id, coalesce(ai_summary, '') from public.support_tickets
  union all
  select t.id, item->>'content'
  from public.support_tickets t
  cross join lateral jsonb_array_elements(t.context_snapshot) as items(item)
  where item ? 'content'
),
ticket_candidates as (
  select t.id, match[4] as candidate
  from ticket_texts t
  cross join lateral regexp_matches(
    t.content,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)([^[:space:],;.!?]+)',
    'gi'
  ) as match

  union all

  select t.id, match[3] as candidate
  from ticket_texts t
  cross join lateral regexp_matches(
    t.content,
    '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)([^[:space:],;.!?]+)',
    'gi'
  ) as match
)
select count(distinct id) as support_ticket_metadata_with_unredacted_recognizable_shorthand_secret
from ticket_candidates
where lower(candidate) not in ('[redacted]', '********');
