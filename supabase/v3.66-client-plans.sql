-- Momo v3.66 — Base / Premium / Business plans
-- Existing organizations keep all current functionality by migrating to Premium.
-- New organizations default to Base unless Admin explicitly chooses another plan.

alter table public.organizations
  add column if not exists plan text;

update public.organizations
set plan = 'premium'
where plan is null
   or plan not in ('base', 'premium', 'business');

alter table public.organizations
  alter column plan set default 'base';

alter table public.organizations
  alter column plan set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_plan_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_plan_check
      check (plan in ('base', 'premium', 'business'));
  end if;
end $$;

create index if not exists organizations_plan_idx
  on public.organizations(plan);
