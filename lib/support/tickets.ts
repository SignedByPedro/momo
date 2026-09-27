import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { redactSupportSecrets } from "@/lib/support/secret-redaction";

export type SupportTicketStatus = "new" | "in_progress" | "resolved";
export type SupportTicketCategory =
  | "general"
  | "technical"
  | "integration"
  | "feature"
  | "billing"
  | "account"
  | "privacy";
export type SupportTicketPriority = "low" | "normal" | "high";

export type SupportTicket = {
  id: string;
  organization_id: string;
  opened_by_user_id: string | null;
  opened_by_email: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  ai_summary: string | null;
  context_snapshot: SupportContextMessage[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  organization_id: string;
  author_type: "client" | "support" | "system";
  author_user_id: string | null;
  author_email: string | null;
  content: string;
  created_at: string;
};

export type SupportContextMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AdminSupportTicket = SupportTicket & {
  organization_name: string;
  organization_primary_language: "pt" | "en";
};

function cleanText(value: string, max: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export function supportTicketReference(id: string) {
  return `SUP-${id.replaceAll("-", "").slice(0, 7).toUpperCase()}`;
}

export async function createSupportTicket(input: {
  organizationId: string;
  openedByUserId: string;
  openedByEmail: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  summary: string;
  initialMessage: string;
  context: SupportContextMessage[];
}) {
  const supabase = createSupabaseAdmin();
  const subject = cleanText(redactSupportSecrets(input.subject), 180) || "Support request";
  const summary = cleanText(redactSupportSecrets(input.summary), 1200);
  const initialMessage = redactSupportSecrets(input.initialMessage).trim().slice(0, 6000);
  const context = input.context
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: redactSupportSecrets(message.content).trim().slice(0, 3000),
    }))
    .filter((message) => message.content);

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      organization_id: input.organizationId,
      opened_by_user_id: input.openedByUserId,
      opened_by_email: input.openedByEmail,
      subject,
      category: input.category,
      priority: input.priority,
      status: "new",
      ai_summary: summary || null,
      context_snapshot: context,
    })
    .select(
      "id, organization_id, opened_by_user_id, opened_by_email, subject, category, priority, status, ai_summary, context_snapshot, created_at, updated_at, resolved_at",
    )
    .single();

  if (error) throw error;

  if (initialMessage) {
    const { error: messageError } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        organization_id: input.organizationId,
        author_type: "client",
        author_user_id: input.openedByUserId,
        author_email: input.openedByEmail,
        content: initialMessage,
      });

    if (messageError) throw messageError;
  }

  return ticket as SupportTicket;
}

export async function getPortalSupportTickets(organizationId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "id, organization_id, opened_by_user_id, opened_by_email, subject, category, priority, status, ai_summary, context_snapshot, created_at, updated_at, resolved_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function getPortalSupportTicket(
  organizationId: string,
  ticketId: string,
) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "id, organization_id, opened_by_user_id, opened_by_email, subject, category, priority, status, ai_summary, context_snapshot, created_at, updated_at, resolved_at",
    )
    .eq("organization_id", organizationId)
    .eq("id", ticketId)
    .maybeSingle();

  if (error) throw error;
  return data as SupportTicket | null;
}

export async function getAdminSupportTickets() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "id, organization_id, opened_by_user_id, opened_by_email, subject, category, priority, status, ai_summary, context_snapshot, created_at, updated_at, resolved_at, organizations(name, primary_language)",
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { organizations, ...ticket } = row;
    const organization = organizations as unknown as { name?: string; primary_language?: "pt" | "en" } | null;
    return {
      ...ticket,
      organization_name: organization?.name ?? "—",
      organization_primary_language: organization?.primary_language === "en" ? "en" : "pt",
    } as AdminSupportTicket;
  });
}

export async function getAdminSupportTicket(ticketId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "id, organization_id, opened_by_user_id, opened_by_email, subject, category, priority, status, ai_summary, context_snapshot, created_at, updated_at, resolved_at, organizations(name, primary_language)",
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { organizations, ...ticket } = data;
  const organization = organizations as unknown as { name?: string; primary_language?: "pt" | "en" } | null;
  return {
    ...ticket,
    organization_name: organization?.name ?? "—",
    organization_primary_language: organization?.primary_language === "en" ? "en" : "pt",
  } as AdminSupportTicket;
}

export async function getSupportTicketMessages(ticketId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select(
      "id, ticket_id, organization_id, author_type, author_user_id, author_email, content, created_at",
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SupportTicketMessage[];
}

export async function addSupportTicketMessage(input: {
  ticketId: string;
  organizationId: string;
  authorType: "client" | "support" | "system";
  authorUserId: string | null;
  authorEmail: string | null;
  content: string;
}) {
  const content = redactSupportSecrets(input.content).trim().slice(0, 6000);
  if (!content) return;

  const supabase = createSupabaseAdmin();
  const { data: message, error } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: input.ticketId,
      organization_id: input.organizationId,
      author_type: input.authorType,
      author_user_id: input.authorUserId,
      author_email: input.authorEmail,
      content,
    })
    .select("id, ticket_id, organization_id, author_type, author_user_id, author_email, content, created_at")
    .single();
  if (error) throw error;

  const { error: updateError } = await supabase
    .from("support_tickets")
    .update({
      status: input.authorType === "client" ? "new" : "in_progress",
      updated_at: new Date().toISOString(),
      resolved_at: null,
    })
    .eq("id", input.ticketId)
    .eq("organization_id", input.organizationId);
  if (updateError) throw updateError;

  return message as SupportTicketMessage;
}

/**
 * A Portal user may only resolve tickets belonging to their own organization.
 * The organization guard is repeated in the update itself, rather than relying
 * on a previous read, to prevent cross-tenant status changes.
 * A repeated submission leaves the original resolved_at timestamp intact.
 */
export async function resolvePortalSupportTicket(
  organizationId: string,
  ticketId: string,
): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("support_tickets")
    .update({ status: "resolved", updated_at: now, resolved_at: now })
    .eq("organization_id", organizationId)
    .eq("id", ticketId)
    .neq("status", "resolved")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function setSupportTicketStatus(
  ticketId: string,
  status: SupportTicketStatus,
) {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      updated_at: now,
      resolved_at: status === "resolved" ? now : null,
    })
    .eq("id", ticketId);

  if (error) throw error;
}

export function supportStatusLabel(status: SupportTicketStatus, language: "pt" | "en" = "pt") {
  if (status === "in_progress") return language === "en" ? "In progress" : "Em análise";
  if (status === "resolved") return language === "en" ? "Resolved" : "Resolvido";
  return language === "en" ? "New" : "Novo";
}

export function supportCategoryLabel(category: SupportTicketCategory, language: "pt" | "en" = "pt") {
  const labels = {
    general: ["Geral", "General"],
    technical: ["Problema técnico", "Technical issue"],
    integration: ["Integração", "Integration"],
    feature: ["Nova funcionalidade", "Feature request"],
    billing: ["Faturação", "Billing"],
    account: ["Conta / acessos", "Account / access"],
    privacy: ["Privacidade / dados", "Privacy / data"],
  } as const;
  const pair = labels[category] ?? labels.general;
  return language === "en" ? pair[1] : pair[0];
}
