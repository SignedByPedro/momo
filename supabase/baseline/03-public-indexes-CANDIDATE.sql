-- Momo v2.15 / CANDIDATE public schema reconstruction from 2026-09-23 inventory.
-- STAGING / NEW SUPABASE ENVIRONMENT ONLY. NEVER RUN ON EXISTING PRODUCTION.
-- Not a production migration. STAGING CANDIDATE, not yet database-tested.
-- Exact v2.15 export confirmed extensions.vector(1536), 0 Storage policies,
-- and the 12 public function bodies. Enable vector in extensions first;
-- requires auth.users in a NEW Supabase and review baseline/README.md.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;
CREATE INDEX agent_configs_organization_idx ON public.agent_configs USING btree (organization_id);

CREATE INDEX api_rate_limits_updated_at_idx ON public.api_rate_limits USING btree (updated_at);

CREATE INDEX client_history_ended_at_idx ON public.client_history USING btree (ended_at DESC);

CREATE INDEX conversations_organization_source_updated_idx ON public.conversations USING btree (organization_id, source, updated_at DESC);

CREATE INDEX conversations_updated_at_idx ON public.conversations USING btree (updated_at DESC);

CREATE INDEX data_retention_runs_created_idx ON public.data_retention_runs USING btree (created_at DESC);

CREATE INDEX data_retention_runs_mode_created_idx ON public.data_retention_runs USING btree (mode, created_at DESC);

CREATE UNIQUE INDEX data_retention_runs_successful_cleanup_source_idx ON public.data_retention_runs USING btree (source_run_id) WHERE ((mode = 'cleanup'::text) AND (status = 'completed'::text) AND (source_run_id IS NOT NULL));

CREATE INDEX data_retention_runs_trigger_created_idx ON public.data_retention_runs USING btree (trigger_source, created_at DESC);

CREATE INDEX knowledge_entries_agent_status_idx ON public.knowledge_entries USING btree (agent_key, status, visibility);

CREATE INDEX knowledge_entries_embedding_hnsw_idx ON public.knowledge_entries USING hnsw (embedding vector_cosine_ops) WHERE (embedding IS NOT NULL);

CREATE INDEX knowledge_entries_organization_idx ON public.knowledge_entries USING btree (organization_id, status, visibility);

CREATE INDEX knowledge_entries_organization_source_idx ON public.knowledge_entries USING btree (organization_id, source_type) WHERE (organization_id IS NOT NULL);

CREATE INDEX leads_conversation_id_idx ON public.leads USING btree (conversation_id);

CREATE INDEX leads_converted_organization_idx ON public.leads USING btree (converted_organization_id) WHERE (converted_organization_id IS NOT NULL);

CREATE INDEX leads_created_at_idx ON public.leads USING btree (created_at DESC);

CREATE INDEX leads_organization_source_created_idx ON public.leads USING btree (organization_id, source, created_at DESC);

CREATE INDEX leads_status_idx ON public.leads USING btree (status);

CREATE INDEX messages_conversation_id_idx ON public.messages USING btree (conversation_id);

CREATE INDEX messages_created_at_idx ON public.messages USING btree (created_at);

CREATE UNIQUE INDEX organization_members_email_lower_idx ON public.organization_members USING btree (lower(email));

CREATE INDEX organization_members_organization_id_idx ON public.organization_members USING btree (organization_id);

CREATE UNIQUE INDEX organization_members_user_id_idx ON public.organization_members USING btree (user_id);

CREATE INDEX organizations_business_type_idx ON public.organizations USING btree (business_type) WHERE (business_type IS NOT NULL);

CREATE INDEX organizations_purge_due_idx ON public.organizations USING btree (updated_at DESC) WHERE (status = 'purge_due'::text);

CREATE INDEX organizations_recovery_due_idx ON public.organizations USING btree (recovery_until) WHERE (status = 'cancelled'::text);

CREATE INDEX organizations_status_idx ON public.organizations USING btree (status, created_at DESC);

CREATE INDEX support_ticket_messages_ticket_created_idx ON public.support_ticket_messages USING btree (ticket_id, created_at);

CREATE INDEX support_tickets_org_created_idx ON public.support_tickets USING btree (organization_id, created_at DESC);

CREATE INDEX support_tickets_status_created_idx ON public.support_tickets USING btree (status, created_at DESC);

CREATE INDEX website_analyses_updated_at_idx ON public.website_analyses USING btree (updated_at DESC);

CREATE INDEX widget_configs_organization_idx ON public.widget_configs USING btree (organization_id);

CREATE UNIQUE INDEX widget_configs_public_key_idx ON public.widget_configs USING btree (public_key);
COMMIT;
