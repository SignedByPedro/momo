-- Acrescenta a faixa 25–49 € ao estudo de mercado em /demo.
-- Executar no SQL Editor do projeto Momo, uma vez, se v3.54 já tiver corrido.

alter table public.demo_sessions
  drop constraint if exists demo_sessions_price_band_check;

alter table public.demo_sessions
  add constraint demo_sessions_price_band_check
  check (price_band is null or price_band in ('25-49', '50-99', '100-149', '150-200'));
