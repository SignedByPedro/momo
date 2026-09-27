-- Momo v2.24 - READ ONLY. Run after the migration.
-- Expect: function_exists=true; public/anon/authenticated=false;
-- service_role=true. Does not execute any destructive function.
with target as (
  select to_regprocedure('public.revoke_organization_membership_guarded(uuid,uuid)') as fn
)
select
  p.oid is not null as function_exists,
  case when p.oid is null then false else exists (
    select 1
    from pg_catalog.aclexplode(
      coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) a
    where a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ) end as public_can_execute,
  coalesce(has_function_privilege('anon', p.oid, 'EXECUTE'), false) as anon_can_execute,
  coalesce(has_function_privilege('authenticated', p.oid, 'EXECUTE'), false) as authenticated_can_execute,
  coalesce(has_function_privilege('service_role', p.oid, 'EXECUTE'), false) as service_role_can_execute
from target t
left join pg_catalog.pg_proc p on p.oid = t.fn;
