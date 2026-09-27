-- Momo v2.15 / CANDIDATE public schema reconstruction from 2026-09-23 inventory.
-- STAGING / NEW SUPABASE ENVIRONMENT ONLY. NEVER RUN ON EXISTING PRODUCTION.
-- Not a production migration. STAGING CANDIDATE, not yet database-tested.
-- Exact v2.15 export confirmed extensions.vector(1536), 0 Storage policies,
-- and the 12 public function bodies. Enable vector in extensions first;
-- requires auth.users in a NEW Supabase and review baseline/README.md.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;
CREATE TABLE public."admin_users" (
  "user_id" uuid NOT NULL,
  "email" text,
  "role" text DEFAULT 'admin'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."agent_configs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text DEFAULT 'Momo'::text NOT NULL,
  "welcome_message" text DEFAULT 'Olá! Como posso ajudar?'::text NOT NULL,
  "placeholder" text DEFAULT 'Escreve uma mensagem...'::text NOT NULL,
  "tone" text DEFAULT 'professional_friendly'::text NOT NULL,
  "custom_instructions" text DEFAULT ''::text NOT NULL,
  "fallback_behavior" text DEFAULT 'collect_contact'::text NOT NULL,
  "supported_languages" text[] DEFAULT ARRAY['pt'::text] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "objective" text DEFAULT 'customer_support'::text NOT NULL,
  "contact_capture_mode" text DEFAULT 'passive'::text NOT NULL,
  "human_handoff_enabled" boolean DEFAULT true NOT NULL,
  "goals" text[] DEFAULT ARRAY['answer_questions'::text] NOT NULL
);

CREATE TABLE public."api_rate_limits" (
  "rate_key" text NOT NULL,
  "window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."client_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "slug" text,
  "website" text,
  "business_type" text,
  "country" text,
  "primary_language" text,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone DEFAULT now() NOT NULL,
  "member_count" integer DEFAULT 0 NOT NULL,
  "conversation_count" integer DEFAULT 0 NOT NULL,
  "lead_count" integer DEFAULT 0 NOT NULL,
  "reason" text DEFAULT 'deleted'::text NOT NULL
);

CREATE TABLE public."conversations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "language" text,
  "business_type" text,
  "website" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "organization_id" uuid,
  "source" text DEFAULT 'momo_sales'::text NOT NULL,
  "visitor_name" text
);

CREATE TABLE public."data_retention_automation" (
  "id" smallint DEFAULT 1 NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "schedule_cron" text DEFAULT '15 3 * * *'::text NOT NULL,
  "schedule_timezone" text DEFAULT 'UTC'::text NOT NULL,
  "policy_version" text DEFAULT '0.5'::text NOT NULL,
  "customer_conversation_months" integer DEFAULT 12 NOT NULL,
  "customer_lead_months" integer DEFAULT 12 NOT NULL,
  "resolved_support_months" integer DEFAULT 12 NOT NULL,
  "dormant_sales_months" integer DEFAULT 12 NOT NULL,
  "last_started_at" timestamp with time zone,
  "last_completed_at" timestamp with time zone,
  "last_status" text DEFAULT 'never'::text NOT NULL,
  "last_run_id" uuid,
  "last_error" text,
  "updated_by_user_id" uuid,
  "updated_by_email" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."data_retention_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "mode" text DEFAULT 'dry_run'::text NOT NULL,
  "executed_by_user_id" uuid,
  "executed_by_email" text NOT NULL,
  "policy_version" text NOT NULL,
  "policy_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "report" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "eligible_total" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source_run_id" uuid,
  "status" text DEFAULT 'completed'::text NOT NULL,
  "deleted_total" bigint DEFAULT 0 NOT NULL,
  "error_summary" text,
  "trigger_source" text DEFAULT 'manual'::text NOT NULL
);

CREATE TABLE public."knowledge_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "agent_key" text DEFAULT 'momo-sales'::text NOT NULL,
  "category" text DEFAULT 'general'::text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "visibility" text DEFAULT 'public'::text NOT NULL,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "embedding" extensions.vector(1536),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "organization_id" uuid,
  "source_type" text DEFAULT 'manual'::text NOT NULL,
  "source_url" text
);

CREATE TABLE public."leads" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid,
  "name" text,
  "email" text,
  "phone" text,
  "website" text,
  "business_type" text,
  "status" text DEFAULT 'new'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  "organization_id" uuid,
  "source" text DEFAULT 'momo_sales'::text NOT NULL,
  "converted_organization_id" uuid
);

CREATE TABLE public."messages" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organization_members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "invited_by" uuid,
  "invited_at" timestamp with time zone DEFAULT now() NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organizations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "website" text,
  "business_type" text,
  "country" text,
  "primary_language" text DEFAULT 'pt'::text NOT NULL,
  "status" text DEFAULT 'setup'::text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "member_limit" integer DEFAULT 2 NOT NULL,
  "terminated_at" timestamp with time zone,
  "recovery_until" timestamp with time zone,
  "termination_reason" text,
  "status_before_termination" text,
  "terminated_by_user_id" uuid,
  "terminated_by_email" text
);

CREATE TABLE public."support_ticket_messages" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "author_type" text NOT NULL,
  "author_user_id" uuid,
  "author_email" text,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."support_tickets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "opened_by_user_id" uuid,
  "opened_by_email" text NOT NULL,
  "subject" text NOT NULL,
  "category" text DEFAULT 'general'::text NOT NULL,
  "priority" text DEFAULT 'normal'::text NOT NULL,
  "status" text DEFAULT 'new'::text NOT NULL,
  "ai_summary" text,
  "context_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);

CREATE TABLE public."website_analyses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "website" text NOT NULL,
  "canonical_url" text,
  "title" text,
  "description" text,
  "content" text DEFAULT ''::text NOT NULL,
  "source_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'success'::text NOT NULL,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."widget_configs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "primary_color" text DEFAULT '#FF7A18'::text NOT NULL,
  "secondary_color" text DEFAULT '#FFB04A'::text NOT NULL,
  "tertiary_color" text DEFAULT '#FF4D00'::text NOT NULL,
  "panel_background" text DEFAULT '#111111'::text NOT NULL,
  "position" text DEFAULT 'right'::text NOT NULL,
  "launcher_size" text DEFAULT 'medium'::text NOT NULL,
  "avatar_style" text DEFAULT 'chat'::text NOT NULL,
  "avatar_url" text,
  "panel_radius" integer DEFAULT 28 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "public_key" text DEFAULT encode(gen_random_bytes(16), 'hex'::text) NOT NULL,
  "is_enabled" boolean DEFAULT false NOT NULL,
  "launcher_style" text DEFAULT 'momo'::text NOT NULL,
  "launcher_image_url" text,
  "hover_label_enabled" boolean DEFAULT true NOT NULL,
  "hover_label_text" text,
  "hover_label_background" text DEFAULT '#171717'::text NOT NULL,
  "hover_label_text_color" text DEFAULT '#B8B8B8'::text NOT NULL
);
COMMIT;
