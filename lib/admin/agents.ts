import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrganization } from "@/lib/admin/organizations";

export type AgentTone =
  | "professional_friendly"
  | "friendly"
  | "direct"
  | "formal";

export type AgentFallbackBehavior =
  | "collect_contact"
  | "human_handoff"
  | "say_unknown";

export type AgentLanguage = "pt" | "en";

export type AgentObjective =
  | "customer_support"
  | "sales_lead_generation"
  | "support_and_sales"
  | "custom";

export type AgentContactCaptureMode = "disabled" | "passive" | "proactive";

export type AgentGoal =
  | "answer_questions"
  | "recommend_products_services"
  | "generate_leads"
  | "encourage_conversion"
  | "collect_booking_requests";

export type ClientAgentConfig = {
  id: string | null;
  organization_id: string;
  name: string;
  welcome_message: string;
  placeholder: string;
  tone: AgentTone;
  custom_instructions: string;
  fallback_behavior: AgentFallbackBehavior;
  supported_languages: AgentLanguage[];
  objective: AgentObjective;
  contact_capture_mode: AgentContactCaptureMode;
  human_handoff_enabled: boolean;
  goals: AgentGoal[];
  created_at: string | null;
  updated_at: string | null;
};


export function defaultAgentPlaceholder(language: AgentLanguage) {
  return language === "en" ? "Write a message..." : "Escreve uma mensagem...";
}

const DEFAULT_AGENT_PLACEHOLDERS = new Set([
  "Escreve uma mensagem...",
  "Write a message...",
]);

export async function syncDefaultAgentPlaceholder(
  organizationId: string,
  language: AgentLanguage,
) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("placeholder")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return;

  const currentPlaceholder = String(data.placeholder ?? "").trim();
  if (!DEFAULT_AGENT_PLACEHOLDERS.has(currentPlaceholder)) return;

  const nextPlaceholder = defaultAgentPlaceholder(language);
  if (currentPlaceholder === nextPlaceholder) return;

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({
      placeholder: nextPlaceholder,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (updateError) throw updateError;
}

export async function syncSingleLanguageAgentLanguage(
  organizationId: string,
  language: AgentLanguage,
) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("supported_languages")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return;

  const current = Array.isArray(data.supported_languages)
    ? data.supported_languages.filter(
        (value): value is AgentLanguage => value === "pt" || value === "en",
      )
    : [];

  // Keep single-language configurations aligned with the organization primary
  // language. If Admin explicitly enabled multiple languages, preserve them.
  if (current.length > 1) return;
  if (current.length === 1 && current[0] === language) return;

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({
      supported_languages: [language],
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (updateError) throw updateError;
}

function defaultWelcome(language: AgentLanguage) {
  return language === "en" ? "Hi! How can I help?" : "Olá! Como posso ajudar?";
}

export async function getClientAgentConfig(
  organizationId: string,
): Promise<ClientAgentConfig | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_configs")
    .select(
      "id, organization_id, name, welcome_message, placeholder, tone, custom_instructions, fallback_behavior, supported_languages, objective, contact_capture_mode, human_handoff_enabled, goals, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as ClientAgentConfig;

  // Defensive fallback for organizations created before the migration trigger exists.
  const organization = await getOrganization(organizationId);
  if (!organization) return null;

  const primaryLanguage: AgentLanguage =
    organization.primary_language === "en" ? "en" : "pt";

  return {
    id: null,
    organization_id: organizationId,
    name: "Momo",
    welcome_message: defaultWelcome(primaryLanguage),
    placeholder: defaultAgentPlaceholder(primaryLanguage),
    tone: "professional_friendly",
    custom_instructions: "",
    fallback_behavior: "human_handoff",
    supported_languages: [primaryLanguage],
    objective: "customer_support",
    contact_capture_mode: "passive",
    human_handoff_enabled: true,
    goals: ["answer_questions"],
    created_at: null,
    updated_at: null,
  };
}

export function agentToneLabel(tone: AgentTone) {
  switch (tone) {
    case "friendly":
      return "Próximo";
    case "direct":
      return "Direto";
    case "formal":
      return "Formal";
    default:
      return "Profissional e próximo";
  }
}

export function fallbackBehaviorLabel(behavior: AgentFallbackBehavior) {
  switch (behavior) {
    case "human_handoff":
      return "Encaminhar para humano";
    case "say_unknown":
      return "Assumir que não sabe";
    default:
      return "Encaminhar para a equipa";
  }
}

export function objectiveLabel(objective: AgentObjective) {
  switch (objective) {
    case "sales_lead_generation":
      return "Vendas / captação de leads";
    case "support_and_sales":
      return "Apoio + vendas";
    case "custom":
      return "Personalizado";
    default:
      return "Apoio ao cliente";
  }
}

export function contactCaptureLabel(mode: AgentContactCaptureMode) {
  switch (mode) {
    case "disabled":
      return "Desativada";
    case "proactive":
      return "Proativa";
    default:
      return "Passiva";
  }
}
