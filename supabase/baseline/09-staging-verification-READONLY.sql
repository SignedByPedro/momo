-- Momo v2.15 / after applying candidate scripts on NEW Supabase STAGING.
-- READ ONLY: catalogue comparisons. Does NOT prove application behaviour.
WITH expected_retention(signature) AS (VALUES
('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz)'),
('public.retention_dry_run_report(timestamptz,timestamptz,timestamptz,timestamptz,timestamptz)'),
('public.retention_execute_cleanup(uuid,uuid,text)'),
('public.retention_mark_terminated_clients_due()'),
('public.retention_run_automatic_cycle()')
),
retention_acl AS (
 SELECT signature,
        to_regprocedure(signature) IS NOT NULL AS function_exists,
        CASE WHEN to_regprocedure(signature) IS NULL THEN false
             ELSE has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE') END AS service_role_ok,
        CASE WHEN to_regprocedure(signature) IS NULL THEN true
             ELSE has_function_privilege('anon',to_regprocedure(signature),'EXECUTE')
               OR has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE')
               END AS public_or_user_execute
 FROM expected_retention
),
public_tables AS (
 SELECT c.oid,c.relname,c.relrowsecurity
 FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r'
   AND c.relname IN ('admin_users','agent_configs','api_rate_limits','client_history','conversations','data_retention_automation','data_retention_runs','knowledge_entries','leads','messages','organization_members','organizations','support_ticket_messages','support_tickets','website_analyses','widget_configs')
)
SELECT now() AS checked_at,
  (SELECT count(*) FROM public_tables) AS momo_table_count_expected_16,
  (SELECT count(*) FROM public_tables WHERE relrowsecurity) AS momo_rls_enabled_expected_16,
  (SELECT count(*) FROM pg_catalog.pg_attribute a WHERE a.attrelid IN (SELECT oid FROM public_tables)
       AND a.attnum > 0 AND NOT a.attisdropped) AS momo_column_count_expected_189,
  (SELECT format_type(a.atttypid,a.atttypmod) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.knowledge_entries'::regclass AND a.attname='embedding') AS embedding_type_expected_vector_1536,
  (SELECT count(*) FROM pg_catalog.pg_constraint c
     WHERE c.conrelid IN (SELECT oid FROM public_tables)) AS momo_constraint_count_expected_83,
  (SELECT count(*) FROM pg_catalog.pg_index i
     WHERE i.indrelid IN (SELECT oid FROM public_tables)) AS momo_index_count_expected_55,
  (SELECT count(*) FROM pg_catalog.pg_trigger t
     WHERE NOT t.tgisinternal AND t.tgrelid IN (SELECT oid FROM public_tables)) AS app_trigger_count_expected_2,
  (SELECT count(*) FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN
      ('consume_api_rate_limit','create_default_agent_config','create_default_widget_config',
       'match_client_knowledge','match_momo_knowledge','match_portal_support_knowledge',
       'retention_dry_run_report','retention_execute_cleanup',
       'retention_mark_terminated_clients_due','retention_run_automatic_cycle')) AS app_function_count_expected_11,
  (SELECT bool_and(function_exists AND service_role_ok AND NOT public_or_user_execute)
    FROM retention_acl) AS five_retention_acls_hardened,
  (SELECT jsonb_agg(to_jsonb(r)) FROM retention_acl r) AS retention_acl_details,
  (SELECT count(*) FROM pg_catalog.pg_policy p
      WHERE p.polrelid IN (SELECT oid FROM public_tables)) AS explicit_momo_policies_expected_0,
  (SELECT count(*) FROM pg_catalog.pg_policies p
       WHERE p.schemaname='storage' AND p.tablename IN ('objects','buckets')) AS storage_policy_count_expected_0,
  (SELECT to_jsonb(b) FROM (SELECT id, name, public, file_size_limit, allowed_mime_types
       FROM storage.buckets WHERE id='widget-assets') b) AS widget_bucket,
  (SELECT count(*) FROM pg_catalog.pg_event_trigger WHERE evtname='ensure_rls') AS ensure_rls_count_review_managed_or_optional;
