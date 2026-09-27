-- Momo v2.14a — READ ONLY verification (safe BEFORE and AFTER the migration).
-- Run in Supabase SQL Editor. This script does NOT invoke any retention RPC.
-- BEFORE: legacy signatures are expected to show public role access.
-- AFTER: all five rows should show PASS, and both cron jobs should show PASS.

with expected(signature) as (
  values
    ('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)'),
    ('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)'),
    ('public.retention_execute_cleanup(uuid,uuid,text)'),
    ('public.retention_run_automatic_cycle()'),
    ('public.retention_mark_terminated_clients_due()')
), inspected as (
  select e.signature, p.oid,
    pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
    p.prosecdef as security_definer,
    case when p.oid is not null
      then has_function_privilege('anon', p.oid, 'EXECUTE') end as anon_execute,
    case when p.oid is not null
      then has_function_privilege('authenticated', p.oid, 'EXECUTE') end as authenticated_execute,
    case when p.oid is not null
      then has_function_privilege('service_role', p.oid, 'EXECUTE') end as service_role_execute,
    case when p.oid is not null then exists (
      select 1
      from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
      where a.grantee = 0 and a.privilege_type = 'EXECUTE'
    ) end as public_execute
  from expected e
  left join pg_catalog.pg_proc p on p.oid = to_regprocedure(e.signature)::oid
)
select *,
  case
    when oid is null then 'MISSING'
    when security_definer is true
     and anon_execute is false
     and authenticated_execute is false
     and service_role_execute is true
     and public_execute is false then 'PASS'
    else 'REVIEW'
  end as result
from inspected
order by signature;

-- Cron role, command and schedule (neither job is executed by this SELECT).
-- Show only whether the command matches; do not print potentially sensitive
-- custom SQL in reports shared outside the Supabase dashboard.
with expected_jobs(jobname, expected_schedule, expected_command) as (
  values
    ('momo-retention-daily', '15 3 * * *',
     'select public.retention_run_automatic_cycle();'),
    ('momo-offboarding-recovery-expiry', '35 3 * * *',
     'select public.retention_mark_terminated_clients_due();')
)
select e.jobname, j.schedule, j.active, j.username,
  case when j.jobid is null then null else
    trim(regexp_replace(lower(j.command), '[[:space:]]+', ' ', 'g')) =
      e.expected_command end as command_matches_expected,
  case
    when j.jobid is null then 'MISSING'
    when j.schedule = e.expected_schedule
     and j.active is true
     and j.username in ('postgres', 'service_role')
     and trim(regexp_replace(lower(j.command), '[[:space:]]+', ' ', 'g')) =
         e.expected_command then 'PASS'
    else 'REVIEW'
  end as result
from expected_jobs e
left join cron.job j on j.jobname = e.jobname
order by e.jobname;

-- Operational status only; reads no customer records or rate-limit keys.
select enabled, last_status, last_started_at, last_completed_at
from public.data_retention_automation
where id = 1;
