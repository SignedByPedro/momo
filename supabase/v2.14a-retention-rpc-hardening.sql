-- Momo v2.14a — Retention RPC privilege hardening
--
-- Run ONCE in the Supabase SQL Editor, after reviewing the read-only report in
-- v2.14a-retention-rpc-verification.sql. This migration changes ONLY EXECUTE
-- privileges on five existing retention RPC signatures. It does not run them,
-- change their bodies/owners, modify data, change retention settings or jobs,
-- or touch unrelated RPCs (including consume_api_rate_limit and Knowledge Base).
--
-- Fail-closed prerequisites:
--  * all five expected signatures exist and are SECURITY DEFINER;
--  * the two existing pg_cron jobs are active at their expected times and use
--    the expected SQL and an accepted execution role (postgres/service_role).
-- If any check fails, the transaction rolls back without changing grants.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
declare
  v_signature text;
  v_function regprocedure;
  v_is_security_definer boolean;
  v_job record;
  v_expected_command text;
  v_expected_schedule text;
  v_job_count integer;
begin
  foreach v_signature in array array[
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_execute_cleanup(uuid,uuid,text)',
    'public.retention_run_automatic_cycle()',
    'public.retention_mark_terminated_clients_due()'
  ] loop
    v_function := to_regprocedure(v_signature);
    if v_function is null then
      raise exception 'V214A_EXPECTED_FUNCTION_MISSING: %', v_signature;
    end if;

    select p.prosecdef into v_is_security_definer
    from pg_catalog.pg_proc p where p.oid = v_function::oid;
    if v_is_security_definer is distinct from true then
      raise exception 'V214A_UNEXPECTED_FUNCTION_SECURITY: %', v_signature;
    end if;
  end loop;

  if to_regclass('cron.job') is null then
    raise exception 'V214A_CRON_CATALOG_MISSING';
  end if;

  select count(*) into v_job_count
  from cron.job
  where jobname in (
    'momo-retention-daily',
    'momo-offboarding-recovery-expiry'
  );
  if v_job_count <> 2 then
    raise exception 'V214A_EXPECTED_CRON_JOBS_MISSING_OR_DUPLICATED';
  end if;

  for v_job in
    select jobname, schedule, active, username, command
    from cron.job
    where jobname in (
      'momo-retention-daily',
      'momo-offboarding-recovery-expiry'
    )
  loop
    if v_job.jobname = 'momo-retention-daily' then
      v_expected_schedule := '15 3 * * *';
      v_expected_command := 'select public.retention_run_automatic_cycle();';
    else
      v_expected_schedule := '35 3 * * *';
      v_expected_command := 'select public.retention_mark_terminated_clients_due();';
    end if;

    if v_job.schedule is distinct from v_expected_schedule
       or v_job.active is distinct from true
       or coalesce(v_job.username, '') not in ('postgres', 'service_role')
       or trim(regexp_replace(lower(v_job.command), '[[:space:]]+', ' ', 'g'))
          is distinct from v_expected_command then
      raise exception 'V214A_UNEXPECTED_CRON_CONFIGURATION: %; review schedule, active, username and command before hardening',
        v_job.jobname;
    end if;
  end loop;
end;
$preflight$;

-- Revoke both inherited PUBLIC defaults and explicit grants that appear in the
-- v2.13 production inventory. Do NOT revoke broadly from unrelated functions.
revoke all privileges on function public.retention_dry_run_report(
  timestamptz, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;

revoke all privileges on function public.retention_dry_run_report(
  timestamptz, timestamptz, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;

revoke all privileges on function public.retention_execute_cleanup(
  uuid, uuid, text
) from public, anon, authenticated;

revoke all privileges on function public.retention_run_automatic_cycle()
  from public, anon, authenticated;

revoke all privileges on function public.retention_mark_terminated_clients_due()
  from public, anon, authenticated;

-- Preserve access for the privileged application client (service_role).
-- The database function owner keeps its owner privileges automatically.
grant execute on function public.retention_dry_run_report(
  timestamptz, timestamptz, timestamptz, timestamptz
) to service_role;

grant execute on function public.retention_dry_run_report(
  timestamptz, timestamptz, timestamptz, timestamptz, timestamptz
) to service_role;

grant execute on function public.retention_execute_cleanup(
  uuid, uuid, text
) to service_role;

grant execute on function public.retention_run_automatic_cycle()
  to service_role;

grant execute on function public.retention_mark_terminated_clients_due()
  to service_role;

-- Assert EFFECTIVE execution privileges; also verify no direct PUBLIC ACL.
-- If a role inherits EXECUTE through another role, this catches it as well.
do $verify$
declare
  v_signature text;
  v_function regprocedure;
  v_has_public_execute boolean;
  v_job record;
  v_job_function regprocedure;
begin
  foreach v_signature in array array[
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)',
    'public.retention_execute_cleanup(uuid,uuid,text)',
    'public.retention_run_automatic_cycle()',
    'public.retention_mark_terminated_clients_due()'
  ] loop
    v_function := to_regprocedure(v_signature);

    if not has_function_privilege('service_role', v_function::oid, 'EXECUTE')
       or has_function_privilege('anon', v_function::oid, 'EXECUTE')
       or has_function_privilege('authenticated', v_function::oid, 'EXECUTE') then
      raise exception 'V214A_EFFECTIVE_GRANT_CHECK_FAILED: %', v_signature;
    end if;

    select exists (
      select 1
      from pg_catalog.pg_proc p,
           pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
      where p.oid = v_function::oid
        and a.grantee = 0
        and a.privilege_type = 'EXECUTE'
    ) into v_has_public_execute;

    if v_has_public_execute then
      raise exception 'V214A_PUBLIC_GRANT_STILL_PRESENT: %', v_signature;
    end if;
  end loop;

  -- Cron execution roles must continue to have EXECUTE after the change.
  for v_job in
    select jobname, username from cron.job
    where jobname in (
      'momo-retention-daily',
      'momo-offboarding-recovery-expiry'
    )
  loop
    if v_job.jobname = 'momo-retention-daily' then
      v_job_function := 'public.retention_run_automatic_cycle()'::regprocedure;
    else
      v_job_function := 'public.retention_mark_terminated_clients_due()'::regprocedure;
    end if;

    if not has_function_privilege(v_job.username, v_job_function::oid, 'EXECUTE') then
      raise exception 'V214A_CRON_EXECUTE_GRANT_MISSING: % (%)',
        v_job.jobname, v_job.username;
    end if;
  end loop;
end;
$verify$;

commit;
