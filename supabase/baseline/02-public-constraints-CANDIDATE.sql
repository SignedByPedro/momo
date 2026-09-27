-- Momo v2.15 / CANDIDATE public schema reconstruction from 2026-09-23 inventory.
-- STAGING / NEW SUPABASE ENVIRONMENT ONLY. NEVER RUN ON EXISTING PRODUCTION.
-- Not a production migration. STAGING CANDIDATE, not yet database-tested.
-- Exact v2.15 export confirmed extensions.vector(1536), 0 Storage policies,
-- and the 12 public function bodies. Enable vector in extensions first;
-- requires auth.users in a NEW Supabase and review baseline/README.md.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;
-- Primary keys

ALTER TABLE public."admin_users" ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_pkey" PRIMARY KEY (id);

ALTER TABLE public."api_rate_limits" ADD CONSTRAINT "api_rate_limits_pkey" PRIMARY KEY (rate_key);

ALTER TABLE public."client_history" ADD CONSTRAINT "client_history_pkey" PRIMARY KEY (id);

ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_pkey" PRIMARY KEY (id);

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_pkey" PRIMARY KEY (id);

ALTER TABLE public."data_retention_runs" ADD CONSTRAINT "data_retention_runs_pkey" PRIMARY KEY (id);

ALTER TABLE public."knowledge_entries" ADD CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY (id);

ALTER TABLE public."leads" ADD CONSTRAINT "leads_pkey" PRIMARY KEY (id);

ALTER TABLE public."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id);

ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY (id);

ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_pkey" PRIMARY KEY (id);

ALTER TABLE public."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY (id);

ALTER TABLE public."support_tickets" ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY (id);

ALTER TABLE public."website_analyses" ADD CONSTRAINT "website_analyses_pkey" PRIMARY KEY (id);

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_pkey" PRIMARY KEY (id);

-- Unique constraints

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_organization_id_key" UNIQUE (organization_id);

ALTER TABLE public."client_history" ADD CONSTRAINT "client_history_organization_id_key" UNIQUE (organization_id);

ALTER TABLE public."knowledge_entries" ADD CONSTRAINT "knowledge_entries_slug_key" UNIQUE (slug);

ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_slug_key" UNIQUE (slug);

ALTER TABLE public."website_analyses" ADD CONSTRAINT "website_analyses_website_key" UNIQUE (website);

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_organization_id_key" UNIQUE (organization_id);

-- CHECK constraints

ALTER TABLE public."admin_users" ADD CONSTRAINT "admin_users_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text]));

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_contact_capture_check" CHECK (contact_capture_mode = ANY (ARRAY['disabled'::text, 'passive'::text, 'proactive'::text]));

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_fallback_check" CHECK (fallback_behavior = ANY (ARRAY['collect_contact'::text, 'human_handoff'::text, 'say_unknown'::text]));

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_goals_check" CHECK (COALESCE(array_length(goals, 1), 0) >= 1 AND goals <@ ARRAY['answer_questions'::text, 'recommend_products_services'::text, 'generate_leads'::text, 'encourage_conversion'::text, 'collect_booking_requests'::text]);

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_languages_check" CHECK (COALESCE(array_length(supported_languages, 1), 0) >= 1 AND supported_languages <@ ARRAY['pt'::text, 'en'::text]);

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_objective_check" CHECK (objective = ANY (ARRAY['customer_support'::text, 'sales_lead_generation'::text, 'support_and_sales'::text, 'custom'::text]));

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_tone_check" CHECK (tone = ANY (ARRAY['professional_friendly'::text, 'friendly'::text, 'direct'::text, 'formal'::text]));

ALTER TABLE public."api_rate_limits" ADD CONSTRAINT "api_rate_limits_request_count_check" CHECK (request_count >= 0);

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_customer_conversation_months_check" CHECK (customer_conversation_months >= 1 AND customer_conversation_months <= 120);

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_customer_lead_months_check" CHECK (customer_lead_months >= 1 AND customer_lead_months <= 120);

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_dormant_sales_months_check" CHECK (dormant_sales_months >= 1 AND dormant_sales_months <= 120);

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_id_check" CHECK (id = 1);

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_resolved_support_months_check" CHECK (resolved_support_months >= 1 AND resolved_support_months <= 120);

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_status_check" CHECK (last_status = ANY (ARRAY['never'::text, 'disabled'::text, 'running'::text, 'no_data'::text, 'completed'::text, 'failed'::text]));

ALTER TABLE public."data_retention_runs" ADD CONSTRAINT "data_retention_runs_deleted_total_check" CHECK (deleted_total >= 0);

ALTER TABLE public."data_retention_runs" ADD CONSTRAINT "data_retention_runs_eligible_total_check" CHECK (eligible_total >= 0);

ALTER TABLE public."data_retention_runs" ADD CONSTRAINT "data_retention_runs_mode_check" CHECK (mode = ANY (ARRAY['dry_run'::text, 'cleanup'::text]));

ALTER TABLE public."data_retention_runs" ADD CONSTRAINT "data_retention_runs_status_check" CHECK (status = ANY (ARRAY['completed'::text, 'failed'::text]));

ALTER TABLE public."data_retention_runs" ADD CONSTRAINT "data_retention_runs_trigger_source_check" CHECK (trigger_source = ANY (ARRAY['manual'::text, 'automatic'::text]));

ALTER TABLE public."knowledge_entries" ADD CONSTRAINT "knowledge_entries_source_type_check" CHECK (source_type = ANY (ARRAY['manual'::text, 'website'::text]));

ALTER TABLE public."knowledge_entries" ADD CONSTRAINT "knowledge_entries_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]));

ALTER TABLE public."knowledge_entries" ADD CONSTRAINT "knowledge_entries_visibility_check" CHECK (visibility = ANY (ARRAY['public'::text, 'internal'::text]));

ALTER TABLE public."messages" ADD CONSTRAINT "messages_role_check" CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text]));

ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_role_check" CHECK (role = ANY (ARRAY['client_owner'::text, 'client_member'::text]));

ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_member_limit_check" CHECK (member_limit >= 1 AND member_limit <= 1000);

ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_primary_language_check" CHECK (primary_language = ANY (ARRAY['pt'::text, 'en'::text]));

ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_status_before_termination_check" CHECK (status_before_termination IS NULL OR (status_before_termination = ANY (ARRAY['setup'::text, 'active'::text, 'paused'::text])));

ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_status_check" CHECK (status = ANY (ARRAY['setup'::text, 'active'::text, 'paused'::text, 'cancelled'::text, 'purge_due'::text]));

ALTER TABLE public."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_type_check" CHECK (author_type = ANY (ARRAY['client'::text, 'support'::text, 'system'::text]));

ALTER TABLE public."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_content_check" CHECK (char_length(content) >= 1 AND char_length(content) <= 6000);

ALTER TABLE public."support_tickets" ADD CONSTRAINT "support_tickets_category_check" CHECK (category = ANY (ARRAY['general'::text, 'technical'::text, 'integration'::text, 'feature'::text, 'billing'::text, 'account'::text, 'privacy'::text]));

ALTER TABLE public."support_tickets" ADD CONSTRAINT "support_tickets_priority_check" CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text]));

ALTER TABLE public."support_tickets" ADD CONSTRAINT "support_tickets_status_check" CHECK (status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text]));

ALTER TABLE public."support_tickets" ADD CONSTRAINT "support_tickets_subject_check" CHECK (char_length(subject) >= 1 AND char_length(subject) <= 180);

ALTER TABLE public."website_analyses" ADD CONSTRAINT "website_analyses_status_check" CHECK (status = ANY (ARRAY['success'::text, 'failed'::text]));

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_avatar_style_check" CHECK (avatar_style = ANY (ARRAY['chat'::text, 'initial'::text, 'image'::text]));

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_launcher_size_check" CHECK (launcher_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text]));

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_launcher_style_check" CHECK (launcher_style = ANY (ARRAY['momo'::text, 'image'::text]));

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_panel_background_check" CHECK (panel_background ~ '^#[0-9A-Fa-f]{6}$'::text);

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_panel_radius_check" CHECK (panel_radius >= 16 AND panel_radius <= 36);

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_position_check" CHECK ("position" = ANY (ARRAY['left'::text, 'right'::text]));

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_primary_color_check" CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'::text);

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_secondary_color_check" CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'::text);

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_tertiary_color_check" CHECK (tertiary_color ~ '^#[0-9A-Fa-f]{6}$'::text);

-- Foreign keys

ALTER TABLE public."admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."agent_configs" ADD CONSTRAINT "agent_configs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE public."data_retention_automation" ADD CONSTRAINT "data_retention_automation_last_run_id_fkey" FOREIGN KEY (last_run_id) REFERENCES data_retention_runs(id) ON DELETE SET NULL;

ALTER TABLE public."data_retention_runs" ADD CONSTRAINT "data_retention_runs_source_run_id_fkey" FOREIGN KEY (source_run_id) REFERENCES data_retention_runs(id) ON DELETE SET NULL;

ALTER TABLE public."knowledge_entries" ADD CONSTRAINT "knowledge_entries_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE public."leads" ADD CONSTRAINT "leads_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

ALTER TABLE public."leads" ADD CONSTRAINT "leads_converted_organization_id_fkey" FOREIGN KEY (converted_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE public."leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE public."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE public."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE public."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;

ALTER TABLE public."support_tickets" ADD CONSTRAINT "support_tickets_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE public."widget_configs" ADD CONSTRAINT "widget_configs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
COMMIT;
