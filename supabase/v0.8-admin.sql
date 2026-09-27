-- Momo V0.8 — Admin dashboard setup
-- Run this once in Supabase → SQL Editor.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

alter table public.leads
  add column if not exists updated_at timestamptz default now();

create index if not exists leads_status_idx on public.leads(status);
create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);
create index if not exists messages_created_at_idx on public.messages(created_at asc);

-- IMPORTANT: after creating your user in Authentication → Users,
-- replace the email below and run ONLY this INSERT separately:
--
-- insert into public.admin_users (user_id, email, role)
-- select id, email, 'owner'
-- from auth.users
-- where email = 'YOUR_ADMIN_EMAIL';
