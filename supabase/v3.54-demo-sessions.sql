-- Momo demo — estudo de mercado em /demo
-- Executar apenas este ficheiro no SQL Editor do projeto Momo, uma vez.
-- Não faz parte da retenção dos clientes. Acesso só pelo service role:
-- a página pública grava através do servidor e o Admin lê no mesmo caminho.
-- Não voltar a executar migrations históricas.

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  language text not null default 'pt' check (language in ('pt', 'en')),
  phase text not null default 'awaiting_name' check (phase in (
    'awaiting_name',
    'exploring',
    'awaiting_price',
    'awaiting_interest',
    'awaiting_email',
    'free'
  )),
  visitor_name text check (visitor_name is null or char_length(visitor_name) between 1 and 80),
  questions_seen text[] not null default '{}',
  price_band text check (price_band is null or price_band in ('50-99', '100-149', '150-200')),
  interested boolean,
  email text check (email is null or char_length(email) between 3 and 180),
  transcript jsonb not null default '[]'::jsonb,
  free_conversation_id uuid,
  constraint demo_sessions_questions_check check (
    questions_seen <@ array['what', 'purpose', 'why']::text[]
  )
);

create index if not exists demo_sessions_created_idx
  on public.demo_sessions (created_at desc);

alter table public.demo_sessions enable row level security;

revoke all on table public.demo_sessions from public, anon, authenticated;
grant select, insert, update on table public.demo_sessions to service_role;
