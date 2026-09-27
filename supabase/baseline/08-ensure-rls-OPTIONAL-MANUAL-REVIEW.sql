-- Momo v2.15 / OBSERVED event-trigger helper + event trigger.
-- OPTIONAL ONLY: Fresh Supabase projects may already include ensure_rls.
-- Requires sufficient privileges. Do not run unless reviewed and missing,
-- and NEVER run on the existing Momo production project.
-- Supabase can manage this object. Confirm expected operational ownership.
-- Run this manually on an ISOLATED test database only if ensure_rls is absent.
BEGIN;
DO $preflight$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_event_trigger WHERE evtname='ensure_rls') THEN
   RAISE EXCEPTION 'V215_ENSURE_RLS_ALREADY_PRESENT: DO NOT OVERRIDE MANAGED EVENT TRIGGER';
 END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
-- Tags and event type exactly as captured. (May require elevated DB privileges.)
CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
COMMIT;
