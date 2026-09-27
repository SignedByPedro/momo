-- Momo v2.16 — READ ONLY (executar ANTES e DEPOIS da migration).
-- Nao invoca nenhuma funcao administrativa nem altera dados/configuracoes.
-- Aguardar 5 PASS nas assinaturas, 2 PASS nos cron jobs apos a migration.

WITH expected(signature) AS (
  VALUES
    ('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)'),
    ('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)'),
    ('public.retention_execute_cleanup(uuid,uuid,text)'),
    ('public.retention_mark_terminated_clients_due()'),
    ('public.retention_run_automatic_cycle()')
), examined AS (
  SELECT e.signature, p.oid,
         p.prosecdef AS security_definer,
         CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('anon',p.oid,'EXECUTE') END AS anon_can_execute,
         CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated',p.oid,'EXECUTE') END AS authenticated_can_execute,
         CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('service_role',p.oid,'EXECUTE') END AS service_role_can_execute,
         CASE WHEN p.oid IS NULL THEN NULL ELSE EXISTS (
            SELECT 1
            FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
            WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
         ) END AS public_can_execute,
         p.proacl::text AS explicit_acl
  FROM expected e
  LEFT JOIN pg_catalog.pg_proc p ON p.oid=to_regprocedure(e.signature)
)
SELECT now() AS checked_at, signature, security_definer, explicit_acl,
       service_role_can_execute, anon_can_execute, authenticated_can_execute, public_can_execute,
       CASE WHEN oid IS NULL THEN 'MISSING'
            WHEN security_definer IS TRUE AND service_role_can_execute IS TRUE
             AND anon_can_execute IS FALSE AND authenticated_can_execute IS FALSE
             AND public_can_execute IS FALSE THEN 'PASS'
            ELSE 'REVIEW' END AS result
FROM examined
ORDER BY signature;

WITH expected_jobs(jobname, expected_schedule, expected_command) AS (
  VALUES
    ('momo-retention-daily','15 3 * * *','select public.retention_run_automatic_cycle();'),
    ('momo-offboarding-recovery-expiry','35 3 * * *','select public.retention_mark_terminated_clients_due();')
)
SELECT e.jobname, j.schedule, j.active, j.username,
       CASE WHEN j.jobid IS NULL THEN NULL ELSE
         trim(regexp_replace(lower(j.command),'[[:space:]]+',' ','g'))=e.expected_command END
         AS command_matches_expected,
       CASE WHEN j.jobid IS NULL THEN 'MISSING'
            WHEN j.schedule=e.expected_schedule AND j.active IS TRUE
             AND j.username IN ('postgres','service_role')
             AND trim(regexp_replace(lower(j.command),'[[:space:]]+',' ','g'))=e.expected_command
             THEN 'PASS'
            ELSE 'REVIEW' END AS result
FROM expected_jobs e LEFT JOIN cron.job j ON j.jobname=e.jobname
ORDER BY e.jobname;

-- Apenas estado operacional; nao le registos dos clientes.
SELECT enabled,last_status,last_started_at,last_completed_at
FROM public.data_retention_automation
WHERE id=1;
