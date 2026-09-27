-- Momo V1.0 — Website analysis cache
-- Run this once in Supabase → SQL Editor.

create table if not exists public.website_analyses (
  id uuid primary key default gen_random_uuid(),
  website text not null unique,
  canonical_url text,
  title text,
  description text,
  content text not null default '',
  source_urls jsonb not null default '[]'::jsonb,
  status text not null default 'success' check (status in ('success', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.website_analyses enable row level security;

create index if not exists website_analyses_updated_at_idx
  on public.website_analyses(updated_at desc);

-- No public RLS policies are intentionally added.
-- The Momo backend accesses this table only through SUPABASE_SECRET_KEY.
