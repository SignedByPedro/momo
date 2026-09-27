-- Momo v3.11 - Admin My account + stronger Support secret redaction
-- Run once in production before deploying the v3.11 code.

begin;

-- Each platform admin can keep a personal Admin UI language preference.
alter table public.admin_users
  add column if not exists ui_language text;

update public.admin_users
set ui_language = 'pt'
where ui_language is null
   or ui_language not in ('pt', 'en');

alter table public.admin_users
  alter column ui_language set default 'pt',
  alter column ui_language set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.admin_users'::regclass
      and conname = 'admin_users_ui_language_check'
  ) then
    alter table public.admin_users
      add constraint admin_users_ui_language_check
      check (ui_language in ('pt', 'en'));
  end if;
end
$$;

-- v3.10 already redacts explicit labels such as "password:" and "senha:".
-- v3.11 also covers common shorthand such as "a minha pass é abc123" and
-- "my pass is abc123". Clean historical Support content so already-stored
-- messages do not keep displaying those values in Admin.

update public.support_ticket_messages
set content = regexp_replace(
  regexp_replace(
    content,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+',
    '\1[REDACTED]',
    'gi'
  ),
  '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
  '\1[REDACTED]',
  'gi'
)
where content ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or content ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+';

update public.support_tickets
set subject = regexp_replace(
  regexp_replace(
    subject,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+',
    '\1[REDACTED]',
    'gi'
  ),
  '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
  '\1[REDACTED]',
  'gi'
)
where subject ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or subject ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+';

update public.support_tickets
set ai_summary = regexp_replace(
  regexp_replace(
    ai_summary,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+',
    '\1[REDACTED]',
    'gi'
  ),
  '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
  '\1[REDACTED]',
  'gi'
)
where ai_summary is not null
  and (
    ai_summary ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
    or ai_summary ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+'
  );

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
            to_jsonb(
              regexp_replace(
                regexp_replace(
                  item->>'content',
                  '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+',
                  '\1[REDACTED]',
                  'gi'
                ),
                '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
                '\1[REDACTED]',
                'gi'
              )
            )
          )
          else item
        end
        order by ordinal
      ),
      '[]'::jsonb
    ) as context_snapshot
  from public.support_tickets as t
  cross join lateral jsonb_array_elements(t.context_snapshot) with ordinality as elements(item, ordinal)
  where t.context_snapshot::text ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
     or t.context_snapshot::text ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+'
  group by t.id
) as cleaned
where ticket.id = cleaned.id;

commit;
