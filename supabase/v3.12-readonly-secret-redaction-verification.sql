-- Momo v3.12 - READ ONLY verification (false-positive fix)
-- Safe metadata/content checks. Does not modify rows.

-- 1) Admin language column + constraint.
select
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'admin_users'
  and c.column_name = 'ui_language';

select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
where con.conrelid = 'public.admin_users'::regclass
  and con.conname = 'admin_users_ui_language_check';

-- 2) No invalid Admin UI language values should remain.
select count(*) as invalid_admin_ui_language_rows
from public.admin_users
where ui_language is null
   or ui_language not in ('pt', 'en');

-- 3) Recognizable shorthand passwords should no longer be stored in Support.
-- Remove the literal [REDACTED] marker before testing so correctly redacted rows
-- are not counted as false positives. These checks return counts only.
select count(*) as support_messages_with_unredacted_recognizable_shorthand_secret
from public.support_ticket_messages
where replace(content, '[REDACTED]', '') ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or replace(content, '[REDACTED]', '') ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+';

select count(*) as support_ticket_metadata_with_unredacted_recognizable_shorthand_secret
from public.support_tickets
where replace(subject, '[REDACTED]', '') ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or replace(subject, '[REDACTED]', '') ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+'
   or replace(coalesce(ai_summary, ''), '[REDACTED]', '') ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or replace(coalesce(ai_summary, ''), '[REDACTED]', '') ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+'
   or replace(context_snapshot::text, '[REDACTED]', '') ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or replace(context_snapshot::text, '[REDACTED]', '') ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+';
