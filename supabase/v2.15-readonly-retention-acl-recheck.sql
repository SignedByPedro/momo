-- Momo v2.15: READ ONLY production verification after v2.14a.
-- Exact-definition export supplied for v2.15 unexpectedly contains old ACLs
-- for 4 legacy retention signatures. Check EFFECTIVE GRANTS + raw ACL NOW.
WITH requested(signature) AS (VALUES
('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)'),
('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)'),
('public.retention_execute_cleanup(uuid,uuid,text)'),
('public.retention_mark_terminated_clients_due()'),
('public.retention_run_automatic_cycle()')
)
SELECT now() AS checked_at, r.signature,
       (to_regprocedure(r.signature) IS NOT NULL) AS function_exists,
       p.prosecdef AS security_definer,
       p.proacl::text AS explicit_acl,
       CASE WHEN p.oid IS NULL THEN false ELSE has_function_privilege('service_role',p.oid,'EXECUTE') END AS service_role_can_execute,
       CASE WHEN p.oid IS NULL THEN true ELSE has_function_privilege('anon',p.oid,'EXECUTE') END AS anon_can_execute,
       CASE WHEN p.oid IS NULL THEN true ELSE has_function_privilege('authenticated',p.oid,'EXECUTE') END AS authenticated_can_execute,
       CASE WHEN p.oid IS NULL THEN true ELSE EXISTS (
         SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
         WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
       ) END AS public_can_execute
FROM requested r
LEFT JOIN pg_catalog.pg_proc p ON p.oid=to_regprocedure(r.signature)
ORDER BY r.signature;
