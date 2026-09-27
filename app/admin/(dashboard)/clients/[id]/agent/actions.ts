"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationOwnerAccess } from "@/lib/portal/auth";
import {
  type AgentContactCaptureMode,
  type AgentFallbackBehavior,
  type AgentGoal,
  type AgentLanguage,
  type AgentObjective,
  type AgentTone,
  getClientAgentConfig,
} from "@/lib/admin/agents";
import { getOrganization } from "@/lib/admin/organizations";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { tr } from "@/lib/i18n/ui";

const allowedTones = new Set<AgentTone>([
  "professional_friendly",
  "friendly",
  "direct",
  "formal",
]);
const allowedFallbacks = new Set<AgentFallbackBehavior>([
  "collect_contact",
  "human_handoff",
  "say_unknown",
]);
const allowedLanguages = new Set<AgentLanguage>(["pt", "en"]);
const allowedObjectives = new Set<AgentObjective>([
  "customer_support",
  "sales_lead_generation",
  "support_and_sales",
  "custom",
]);
const allowedContactModes = new Set<AgentContactCaptureMode>([
  "disabled",
  "passive",
  "proactive",
]);
const allowedGoals = new Set<AgentGoal>([
  "answer_questions",
  "recommend_products_services",
  "generate_leads",
  "encourage_conversion",
  "collect_booking_requests",
]);

function clean(value: FormDataEntryValue | null, max = 20_000) {
  return String(value ?? "").trim().slice(0, max);
}

function agentPath(organizationId: string, surface: "admin" | "portal" = "admin") {
  return surface === "portal" ? "/portal/agent" : `/admin/clients/${organizationId}/agent`;
}

function redirectWith(
  organizationId: string,
  key: "notice" | "error",
  message: string,
  surface: "admin" | "portal" = "admin",
): never {
  redirect(`${agentPath(organizationId, surface)}?${key}=${encodeURIComponent(message)}`);
}

export async function saveClientAgentConfig(formData: FormData) {
  const organizationId = clean(formData.get("organizationId"), 100);
  const access = await requireOrganizationOwnerAccess(organizationId);
  const language = access.portal?.language ?? "pt";
  const name = clean(formData.get("name"), 80);
  const welcomeMessage = clean(formData.get("welcomeMessage"), 500);
  const placeholder = clean(formData.get("placeholder"), 160);
  const tone = clean(formData.get("tone"), 40) as AgentTone;
  const fallbackBehavior = clean(
    formData.get("fallbackBehavior"),
    40,
  ) as AgentFallbackBehavior;
  const objective = clean(formData.get("objective"), 50) as AgentObjective;
  const contactCaptureMode = clean(
    formData.get("contactCaptureMode"),
    30,
  ) as AgentContactCaptureMode;
  const humanHandoffEnabled = formData.get("humanHandoffEnabled") === "on";
  const customInstructions = clean(formData.get("customInstructions"), 8_000);
  const languages = formData
    .getAll("supportedLanguages")
    .map((value) => String(value))
    .filter((value): value is AgentLanguage =>
      allowedLanguages.has(value as AgentLanguage),
    );
  let supportedLanguages = Array.from(new Set(languages));
  const goals = Array.from(
    new Set(
      formData
        .getAll("goals")
        .map((value) => String(value))
        .filter((value): value is AgentGoal => allowedGoals.has(value as AgentGoal)),
    ),
  );

  if (!organizationId) return;
  if (!name) redirectWith(organizationId, "error", tr(language, "O nome do agente é obrigatório.", "Agent name is required."), access.surface);
  if (!welcomeMessage) {
    redirectWith(organizationId, "error", tr(language, "A mensagem inicial é obrigatória.", "Welcome message is required."), access.surface);
  }
  if (!placeholder) {
    redirectWith(organizationId, "error", tr(language, "O placeholder é obrigatório.", "Message placeholder is required."), access.surface);
  }
  if (!allowedTones.has(tone)) {
    redirectWith(organizationId, "error", tr(language, "O tom selecionado não é válido.", "The selected tone is invalid."), access.surface);
  }
  if (!allowedFallbacks.has(fallbackBehavior)) {
    redirectWith(organizationId, "error", tr(language, "O comportamento de fallback não é válido.", "The selected fallback behavior is invalid."), access.surface);
  }
  if (!allowedObjectives.has(objective)) {
    redirectWith(organizationId, "error", tr(language, "O objetivo selecionado não é válido.", "The selected objective is invalid."), access.surface);
  }
  if (!allowedContactModes.has(contactCaptureMode)) {
    redirectWith(organizationId, "error", tr(language, "A política de contactos não é válida.", "The contact policy is invalid."), access.surface);
  }
  if (!goals.length) {
    redirectWith(organizationId, "error", tr(language, "Seleciona pelo menos um objetivo operacional.", "Select at least one operational goal."), access.surface);
  }

  const organization = await getOrganization(organizationId);
  if (!organization) redirectWith(organizationId, "error", tr(language, "Cliente não encontrado.", "Client not found."), access.surface);

  if (access.surface === "portal") {
    const existingConfig = await getClientAgentConfig(organizationId);
    supportedLanguages = existingConfig?.supported_languages?.length
      ? existingConfig.supported_languages
      : [organization.primary_language === "en" ? "en" : "pt"];
  }

  if (!supportedLanguages.length) {
    redirectWith(organizationId, "error", tr(language, "Seleciona pelo menos um idioma.", "Select at least one language."), access.surface);
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("agent_configs").upsert(
    {
      organization_id: organizationId,
      name,
      welcome_message: welcomeMessage,
      placeholder,
      tone,
      custom_instructions: customInstructions,
      fallback_behavior: fallbackBehavior,
      supported_languages: supportedLanguages,
      objective,
      contact_capture_mode: contactCaptureMode,
      human_handoff_enabled: humanHandoffEnabled,
      goals,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) throw error;

  revalidatePath(agentPath(organizationId, "admin"));
  revalidatePath("/portal/agent");
  revalidatePath(`/admin/clients/${organizationId}`);
  redirectWith(organizationId, "notice", tr(language, "Configuração do agente guardada.", "Agent configuration saved."), access.surface);
}
