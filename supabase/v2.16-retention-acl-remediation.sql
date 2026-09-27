-- Momo v2.16 — retention RPC EXECUTE permissions remediation.
--
-- Motivacao: em 2026-09-23, um recheck read-only em producao mostrou que
-- quatro assinaturas SECURITY DEFINER ainda podiam ser chamadas por anon e
-- authenticated, apesar da verificacao declarada de v2.14a.
--
-- Esta migration e idempotente e altera APENAS GRANTs destas quatro assinaturas.
-- Nao altera corpos SQL, parametros, dados, jobs, configuracoes, retencao
-- de 48 horas, nem recuperacao de 90 dias.
--
-- Antes de aplicar: confirmar que o SQL Editor esta no projeto de PRODUCAO
-- correto e executar v2.16-readonly-retention-acl-verification.sql.
-- Se surgir V216_*, a transacao e revertida por inteiro. Nao forcar.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
DECLARE
  v_signature text;
  v_function regprocedure;
  v_job record;
  v_expected_schedule text;
  v_expected_command text;
  v_job_count integer;
BEGIN
  -- Validar as cinco assinaturas, incluindo a v2.13 ja restrita.
  FOREACH v_signature IN ARRAY ARRAY[
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_execute_cleanup(uuid,uuid,text)',
    'public.retention_mark_terminated_clients_due()',
    'public.retention_run_automatic_cycle()'
  ] LOOP
    v_function := to_regprocedure(v_signature);
    IF v_function IS NULL THEN
      RAISE EXCEPTION 'V216_EXPECTED_FUNCTION_MISSING: %', v_signature;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc p
      WHERE p.oid = v_function::oid
        AND p.prosecdef IS TRUE
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
    ) THEN
      RAISE EXCEPTION 'V216_UNEXPECTED_FUNCTION_SECURITY_OR_OWNER: %', v_signature;
    END IF;
  END LOOP;

  IF to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION 'V216_CRON_CATALOG_MISSING';
  END IF;

  SELECT count(*) INTO v_job_count
  FROM cron.job
  WHERE jobname IN ('momo-retention-daily', 'momo-offboarding-recovery-expiry');
  IF v_job_count <> 2 THEN
    RAISE EXCEPTION 'V216_EXPECTED_CRON_JOBS_MISSING_OR_DUPLICATED';
  END IF;

  FOR v_job IN
    SELECT jobname, schedule, active, username, command
    FROM cron.job
    WHERE jobname IN ('momo-retention-daily', 'momo-offboarding-recovery-expiry')
  LOOP
    IF v_job.jobname = 'momo-retention-daily' THEN
      v_expected_schedule := '15 3 * * *';
      v_expected_command := 'select public.retention_run_automatic_cycle();';
    ELSE
      v_expected_schedule := '35 3 * * *';
      v_expected_command := 'select public.retention_mark_terminated_clients_due();';
    END IF;

    IF v_job.schedule IS DISTINCT FROM v_expected_schedule
       OR v_job.active IS DISTINCT FROM TRUE
       OR coalesce(v_job.username, '') NOT IN ('postgres', 'service_role')
       OR trim(regexp_replace(lower(v_job.command), '[[:space:]]+', ' ', 'g'))
          IS DISTINCT FROM v_expected_command THEN
      RAISE EXCEPTION 'V216_UNEXPECTED_CRON_CONFIGURATION: %', v_job.jobname;
    END IF;
  END LOOP;
END;
$preflight$;

-- REVOKE de PUBLIC nao revoga GRANTs explicitos para anon/authenticated.
-- Revogar os tres explicitamente. Nao modificar outras RPCs.
REVOKE ALL PRIVILEGES ON FUNCTION public.retention_dry_run_report(
  timestamptz,timestamptz,timestamptz,timestamptz
) FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.retention_execute_cleanup(
  uuid,uuid,text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.retention_mark_terminated_clients_due()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION public.retention_run_automatic_cycle()
  FROM PUBLIC, anon, authenticated;

-- O Admin utiliza service_role. O owner postgres conserva os seus direitos.
GRANT EXECUTE ON FUNCTION public.retention_dry_run_report(
  timestamptz,timestamptz,timestamptz,timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.retention_execute_cleanup(uuid,uuid,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.retention_mark_terminated_clients_due()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.retention_run_automatic_cycle()
  TO service_role;

-- Fail-closed: confirmar estado efetivo das cinco assinaturas e dos cron jobs.
DO $postcheck$
DECLARE
  v_signature text;
  v_function regprocedure;
  v_job record;
  v_job_function regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_execute_cleanup(uuid,uuid,text)',
    'public.retention_mark_terminated_clients_due()',
    'public.retention_run_automatic_cycle()'
  ] LOOP
    v_function := to_regprocedure(v_signature);
    IF NOT has_function_privilege('service_role', v_function::oid, 'EXECUTE')
       OR has_function_privilege('anon', v_function::oid, 'EXECUTE')
       OR has_function_privilege('authenticated', v_function::oid, 'EXECUTE')
       OR EXISTS (
         SELECT 1
         FROM pg_catalog.pg_proc p,
              pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
         WHERE p.oid = v_function::oid
           AND a.grantee = 0
           AND a.privilege_type = 'EXECUTE'
       ) THEN
      RAISE EXCEPTION 'V216_ACL_POSTCHECK_FAILED: %', v_signature;
    END IF;
  END LOOP;

  FOR v_job IN
    SELECT jobname, username
    FROM cron.job
    WHERE jobname IN ('momo-retention-daily', 'momo-offboarding-recovery-expiry')
  LOOP
    IF v_job.jobname = 'momo-retention-daily' THEN
      v_job_function := 'public.retention_run_automatic_cycle()'::regprocedure;
    ELSE
      v_job_function := 'public.retention_mark_terminated_clients_due()'::regprocedure;
    END IF;

    IF NOT has_function_privilege(v_job.username, v_job_function::oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'V216_CRON_EXECUTE_POSTCHECK_FAILED: %', v_job.jobname;
    END IF;
  END LOOP;
END;
$postcheck$;

COMMIT;
