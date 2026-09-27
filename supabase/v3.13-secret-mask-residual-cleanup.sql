-- Momo v3.13 - Friendly secret mask + residual cleanup
-- Replaces the visible [REDACTED] marker with ******** and re-scrubs
-- recognized shorthand password values in Support storage.

begin;

-- Convert the old visible marker everywhere it can appear in Support tickets.
update public.support_ticket_messages
set content = replace(content, '[REDACTED]', '********')
where content like '%[REDACTED]%';

update public.support_tickets
set subject = replace(subject, '[REDACTED]', '********')
where subject like '%[REDACTED]%';

update public.support_tickets
set ai_summary = replace(ai_summary, '[REDACTED]', '********')
where ai_summary is not null
  and ai_summary like '%[REDACTED]%';

update public.support_tickets
set context_snapshot = replace(context_snapshot::text, '[REDACTED]', '********')::jsonb
where context_snapshot::text like '%[REDACTED]%';

-- Re-run the shorthand scrub with the new display mask. This is idempotent and
-- also catches any recognizable value that may have been stored before v3.11.
update public.support_ticket_messages
set content = regexp_replace(
  regexp_replace(
    content,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+',
    '\1********',
    'gi'
  ),
  '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
  '\1********',
  'gi'
)
where content ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or content ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+';

update public.support_tickets
set subject = regexp_replace(
  regexp_replace(
    subject,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+',
    '\1********',
    'gi'
  ),
  '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
  '\1********',
  'gi'
)
where subject ~* '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+'
   or subject ~* '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+';

update public.support_tickets
set ai_summary = regexp_replace(
  regexp_replace(
    ai_summary,
    '((a[[:space:]]+minha|minha|o[[:space:]]+meu|meu|my)[[:space:]]+pass[[:space:]]*(=|:|->|é|e|is)[[:space:]]*)[^[:space:],;.!?]+',
    '\1********',
    'gi'
  ),
  '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
  '\1********',
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
                  '\1********',
                  'gi'
                ),
                '(pass[[:space:]]*(=|:|->|é|e)[[:space:]]*)[^[:space:],;.!?]+',
                '\1********',
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
