-- Momo v2.7 — Portal support assistant + human support tickets

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opened_by_user_id uuid,
  opened_by_email text not null,
  subject text not null check (char_length(subject) between 1 and 180),
  category text not null default 'general' check (category in ('general','technical','integration','feature','billing','account','privacy')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'new' check (status in ('new','in_progress','resolved')),
  ai_summary text,
  context_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_org_created_idx
  on public.support_tickets (organization_id, created_at desc);

create index if not exists support_tickets_status_created_idx
  on public.support_tickets (status, created_at desc);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_type text not null check (author_type in ('client','support','system')),
  author_user_id uuid,
  author_email text,
  content text not null check (char_length(content) between 1 and 6000),
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_created_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- The portal/admin only access these tables through authenticated server code
-- using the Supabase service role. No anon/authenticated table policies are added.
