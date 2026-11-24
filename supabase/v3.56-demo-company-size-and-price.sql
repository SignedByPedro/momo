-- Demo: dimensão da empresa + faixa 0–25 €.
-- Executar no SQL Editor do projeto Momo, uma vez, se v3.54/v3.55 já tiverem corrido.

alter table public.demo_sessions
  drop constraint if exists demo_sessions_phase_check;

alter table public.demo_sessions
  add constraint demo_sessions_phase_check
  check (phase in (
    'awaiting_name',
    'exploring',
    'awaiting_company_size',
    'awaiting_price',
    'awaiting_interest',
    'awaiting_email',
    'free'
  ));

alter table public.demo_sessions
  add column if not exists company_size text;

alter table public.demo_sessions
  drop constraint if exists demo_sessions_company_size_check;

alter table public.demo_sessions
  add constraint demo_sessions_company_size_check
  check (company_size is null or company_size in ('1-5', '6-20', '21-50', '51-200', '201+'));

alter table public.demo_sessions
  drop constraint if exists demo_sessions_price_band_check;

alter table public.demo_sessions
  add constraint demo_sessions_price_band_check
  check (price_band is null or price_band in ('0-25', '25-49', '50-99', '100-149', '150-200'));
