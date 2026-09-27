-- Momo v2.14/Fase 1 — inventário de METADADOS (READ ONLY).
-- Não cria, elimina ou modifica dados/configurações. Não contém dados de clientes.
-- Executar isoladamente no Supabase SQL Editor com permissão para consultar os
-- catálogos PostgreSQL. Guardar a saída num local privado e rever antes de partilhar.
-- IMPORTANTE: esta consulta NÃO é uma migration nem produz uma baseline executável.

-- Cada linha devolve uma secção e um documento JSON com metadados do esquema.
with
  public_tables as (
    select n.nspname as schema_name,
           c.relname as table_name,
           c.relkind as relation_kind,
           c.relpersistence as persistence,
           c.relrowsecurity as rls_enabled,
           c.relforcerowsecurity as rls_forced
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'S')
  ),
  public_columns as (
    select c.table_schema, c.table_name, c.ordinal_position,
           c.column_name, c.data_type, c.udt_schema, c.udt_name,
           c.is_nullable, c.column_default,
           c.is_identity, c.identity_generation
    from information_schema.columns c
    where c.table_schema = 'public'
  ),
  public_constraints as (
    select n.nspname as schema_name, cls.relname as table_name,
           con.conname as constraint_name, con.contype as constraint_type,
           pg_catalog.pg_get_constraintdef(con.oid, true) as definition
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class cls on cls.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = cls.relnamespace
    where n.nspname = 'public'
  ),
  public_functions as (
    select n.nspname as schema_name, p.proname as function_name,
           pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
           pg_catalog.pg_get_function_result(p.oid) as result_type,
           p.prosecdef as security_definer,
           p.provolatile as volatility,
           p.proconfig as per_function_settings,
           coalesce(p.proacl::text, '(PostgreSQL defaults)') as explicit_acl
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ),
  public_triggers as (
    select cls.relname as table_name, tg.tgname as trigger_name,
           pg_catalog.pg_get_triggerdef(tg.oid, true) as definition
    from pg_catalog.pg_trigger tg
    join pg_catalog.pg_class cls on cls.oid = tg.tgrelid
    join pg_catalog.pg_namespace n on n.oid = cls.relnamespace
    where n.nspname = 'public' and not tg.tgisinternal
  )
select '01_tables' as section,
       coalesce(jsonb_agg(to_jsonb(t) order by t.table_name), '[]'::jsonb) as metadata
from public_tables t
union all
select '02_columns',
       coalesce(jsonb_agg(to_jsonb(c) order by c.table_name, c.ordinal_position), '[]'::jsonb)
from public_columns c
union all
select '03_constraints',
       coalesce(jsonb_agg(to_jsonb(c) order by c.table_name, c.constraint_name), '[]'::jsonb)
from public_constraints c
union all
select '04_indexes',
       coalesce(jsonb_agg(to_jsonb(i) order by i.tablename, i.indexname), '[]'::jsonb)
from pg_catalog.pg_indexes i
where i.schemaname = 'public'
union all
select '05_policies',
       coalesce(jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname), '[]'::jsonb)
from pg_catalog.pg_policies p
where p.schemaname = 'public'
union all
select '06_functions',
       coalesce(jsonb_agg(to_jsonb(f) order by f.function_name, f.arguments), '[]'::jsonb)
from public_functions f
union all
select '07_triggers',
       coalesce(jsonb_agg(to_jsonb(t) order by t.table_name, t.trigger_name), '[]'::jsonb)
from public_triggers t
union all
select '08_extensions',
       coalesce(jsonb_agg(jsonb_build_object(
         'name', e.extname,
         'version', e.extversion,
         'schema', n.nspname
       ) order by e.extname), '[]'::jsonb)
from pg_catalog.pg_extension e
join pg_catalog.pg_namespace n on n.oid = e.extnamespace
union all
select '09_table_grants',
       coalesce(jsonb_agg(to_jsonb(g) order by g.table_name, g.grantee, g.privilege_type), '[]'::jsonb)
from information_schema.table_privileges g
where g.table_schema = 'public'
order by section;

-- OPCIONAL: executar esta consulta separadamente apenas se a extensão pg_cron
-- estiver instalada e o utilizador tiver permissão sobre cron.job.
-- select jobname, schedule, active from cron.job
-- where jobname in ('momo-retention-daily', 'momo-offboarding-recovery-expiry')
-- order by jobname;

-- OPCIONAL: executar separadamente se o esquema Storage estiver disponível.
-- select id, name, public from storage.buckets
-- where id = 'widget-assets';
