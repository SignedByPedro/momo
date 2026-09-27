-- Momo v2.15 — READ ONLY. Run as its own query in the Supabase SQL Editor.
-- Captures definition metadata missing from the v2.14 inventory; NO DDL/DML.
-- PLEASE REVIEW function source before sharing: existing SQL could contain
-- legacy hardcoded secrets, external endpoints or privileged logic.
-- This query does NOT return customer table rows, raw rate_keys or user data.
-- Returns one JSON metadata array per section (6 rows).
WITH
  funcs AS (
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS arguments,
           pg_get_userbyid(p.proowner) AS owner_name,
           p.prosecdef AS security_definer,
           p.proconfig AS function_settings,
           COALESCE(p.proacl::text, '(default)') AS explicit_acl,
           pg_get_functiondef(p.oid) AS definition_sql
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  ),
  precise_columns AS (
    SELECT c.relname AS table_name, a.attname AS column_name,
           format_type(a.atttypid, a.atttypmod) AS exact_type,
           a.attnotnull AS not_null,
           a.attidentity AS identity_kind,
           pg_get_expr(d.adbin, d.adrelid) AS default_sql
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
      AND a.attnum > 0 AND NOT a.attisdropped
  ),
  object_policies AS (
    SELECT schemaname, tablename, policyname, permissive, roles,
           cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename IN ('objects','buckets')
  ),
  widget_bucket AS (
    SELECT b.id, b.name, b.public, b.file_size_limit, b.allowed_mime_types
    FROM storage.buckets b WHERE b.id = 'widget-assets'
  ),
  evt AS (
    SELECT e.evtname AS event_trigger_name, e.evtevent AS event_type,
           e.evtenabled AS enabled_code, e.evttags AS tags,
           p.proname AS function_name, n.nspname AS function_schema
    FROM pg_event_trigger e
    JOIN pg_proc p ON p.oid = e.evtfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' OR e.evtname ILIKE '%rls%'
  ),
  default_privs AS (
    SELECT pg_get_userbyid(d.defaclrole) AS role_name,
           COALESCE(n.nspname, '(all schemas)') AS schema_name,
           d.defaclobjtype AS object_type, d.defaclacl::text AS acl
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE n.nspname = 'public' OR d.defaclnamespace = 0
  )
SELECT '01_function_ddl_current' AS section,
       COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.function_name, f.arguments) FROM funcs f), '[]'::jsonb) AS metadata
UNION ALL
SELECT '02_column_exact_types',
       COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.table_name, c.column_name) FROM precise_columns c), '[]'::jsonb)
UNION ALL
SELECT '03_storage_policies',
       COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname) FROM object_policies p), '[]'::jsonb)
UNION ALL
SELECT '04_widget_bucket',
       COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.name) FROM widget_bucket b), '[]'::jsonb)
UNION ALL
SELECT '05_event_triggers',
       COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.event_trigger_name) FROM evt e), '[]'::jsonb)
UNION ALL
SELECT '06_default_acl',
       COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.role_name, d.schema_name) FROM default_privs d), '[]'::jsonb)
ORDER BY section;
