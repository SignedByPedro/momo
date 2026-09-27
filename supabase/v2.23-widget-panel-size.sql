-- Momo v2.23 — configurable chat panel dimensions.
-- Run once in Supabase SQL Editor BEFORE deploying the v2.23 application.
-- Existing widgets keep their current 390 x 570 px size.
-- These database checks also enforce the minimum/maximum if the UI is bypassed.

begin;

alter table public.widget_configs
  add column if not exists panel_width integer not null default 390
    constraint widget_configs_panel_width_bounds check (panel_width between 390 and 520);

alter table public.widget_configs
  add column if not exists panel_height integer not null default 570
    constraint widget_configs_panel_height_bounds check (panel_height between 570 and 760);

comment on column public.widget_configs.panel_width is
  'Chat panel width in px, minimum is the original 390 px.';

comment on column public.widget_configs.panel_height is
  'Chat panel height in px, minimum is the original 570 px.';

commit;
