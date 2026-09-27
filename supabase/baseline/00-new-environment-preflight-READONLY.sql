-- Momo v2.15: RUN ON A NEW / ISOLATED SUPABASE ONLY. READ-ONLY.
-- This must report zero already-existing Momo tables before executing 01.
WITH existing AS (
  SELECT count(*) AS target_table_count
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND c.relname IN ('admin_users','agent_configs','api_rate_limits','client_history','conversations','data_retention_automation','data_retention_runs','knowledge_entries','leads','messages','organization_members','organizations','support_ticket_messages','support_tickets','website_analyses','widget_configs')
)
SELECT
  now() AS checked_at,
  existing.target_table_count,
  to_regclass('auth.users') IS NOT NULL AS auth_users_exists,
  EXISTS (SELECT 1 FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace
          WHERE e.extname='vector' AND n.nspname='extensions') AS vector_in_extensions,
  EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname='pgcrypto') AS pgcrypto_available,
  to_regclass('storage.buckets') IS NOT NULL AS storage_buckets_exists,
  (SELECT count(*) FROM pg_catalog.pg_event_trigger WHERE evtname='ensure_rls') AS existing_ensure_rls_count
FROM existing;
