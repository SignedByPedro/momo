"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePortal, requirePortalOwner } from "@/lib/portal/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";
import { createSupportTicket } from "@/lib/support/tickets";
import { sendNewSupportTicketNotification } from "@/lib/notifications/support-email";

function clean(value: FormDataEntryValue | null, max = 500) { return String(value ?? "").trim().slice(0, max); }
function normalizeWebsite(value: string) { if (!value) return null; const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`; try { const url = new URL(candidate); return ["http:", "https:"].includes(url.protocol) ? url.toString() : null; } catch { return null; } }

export async function updatePortalOrganization(formData: FormData) {
  const session = await requirePortalOwner();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  const websiteInput = clean(formData.get("website"), 500);
  const website = normalizeWebsite(websiteInput);
  const businessType = clean(formData.get("businessType"), 120) || null;
  const country = clean(formData.get("country"), 120) || null;
  if (websiteInput && !website) redirect(`/portal/settings?error=${encodeURIComponent(tr(l,"Website inválido.","Invalid website."))}`);
  const supabase = createSupabaseAdmin();
  // Primary language is set exclusively by the platform Admin. Never accept
  // a posted primaryLanguage field, even from a client Owner.
  const { error } = await supabase.from("organizations").update({ website, business_type: businessType, country, updated_at: new Date().toISOString() }).eq("id", session.organizationId);
  if (error) throw error;
  revalidatePath("/portal/settings"); revalidatePath("/portal", "layout"); revalidatePath("/portal/agent"); revalidatePath("/portal/widget");
  redirect(`/portal/settings?notice=${encodeURIComponent(tr(l,"Dados da empresa atualizados.","Company details updated."))}`);
}

/** An Owner can request a language change; only the Momo Admin can apply it. */
export async function requestPrimaryLanguageChange() {
  const session = await requirePortalOwner();
  const supabase = createSupabaseAdmin();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("primary_language")
    .eq("id", session.organizationId)
    .maybeSingle();

  if (organizationError) throw organizationError;
  if (!organization) {
    redirect(`/portal/settings?error=${encodeURIComponent(tr(session.language, "Empresa não encontrada.", "Company not found."))}`);
  }

  const current = organization.primary_language === "en" ? "en" : "pt";
  const requested = current === "en" ? "pt" : "en";
  const l = session.language;
  const languageName = (code: "pt" | "en") => code === "en" ? "English" : "Português";
  const subject = tr(l, "Pedido de alteração do idioma principal", "Primary language change request");

  // Keep one open request per organization rather than opening a new ticket
  // whenever an Owner clicks the button again.
  const { data: existing, error: existingError } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("category", "account")
    .eq("subject", subject)
    .neq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) {
    redirect(`/portal/support/${existing.id}?notice=${encodeURIComponent(tr(l, "Já existe um pedido de alteração do idioma principal em aberto.", "A primary language change request is already open."))}`);
  }

  const initialMessage = tr(
    l,
    `Solicito a alteração do idioma principal da organização ${session.organizationName} de ${languageName(current)} para ${languageName(requested)}. Sei que esta alteração é efetuada exclusivamente pela equipa Momo, após análise do ticket.`,
    `I request a change of the primary language for ${session.organizationName} from ${languageName(current)} to ${languageName(requested)}. I understand that only the Momo team can make this change after reviewing the ticket.`,
  );
  const ticket = await createSupportTicket({
    organizationId: session.organizationId,
    openedByUserId: session.userId,
    openedByEmail: session.email,
    subject,
    category: "account",
    priority: "normal",
    summary: tr(l, `Pedido de owner: rever alteração do idioma principal de ${languageName(current)} para ${languageName(requested)}. Não alterar sem validar.`, `Owner request: review primary language change from ${languageName(current)} to ${languageName(requested)}. Verify before applying.`),
    initialMessage,
    context: [{ role: "user", content: initialMessage }],
  });

  try {
    await sendNewSupportTicketNotification({
      ticketId: ticket.id,
      organizationName: session.organizationName,
      openedByEmail: session.email,
      subject: ticket.subject,
      summary: ticket.ai_summary,
      category: ticket.category,
      priority: ticket.priority,
    });
  } catch (error) {
    console.error("[support-notification] Could not notify of primary language change:", error);
  }

  revalidatePath("/portal/support");
  redirect(`/portal/support/${ticket.id}?notice=${encodeURIComponent(tr(l, "Pedido criado. A equipa Momo vai analisá-lo antes de alterar o idioma.", "Request created. The Momo team will review it before changing the language."))}`);
}

export async function requestOrganizationDataDeletion(formData: FormData) {
  const session = await requirePortal();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  if (session.role !== "client_owner") {
    redirect(`/portal?error=${encodeURIComponent(tr(l,"Sem permissão para pedir a eliminação da organização.","You do not have permission to request deletion of the organisation."))}`);
  }
  const confirmation = clean(formData.get("confirmation"), 160);

  if (confirmation !== session.organizationName) {
    redirect(`/portal/settings?error=${encodeURIComponent(tr(l,"Escreve exatamente o nome da empresa para confirmar o pedido de eliminação.","Type the company name exactly to confirm the deletion request."))}`);
  }

  const supabase = createSupabaseAdmin();
  const subject = tr(l, "Pedido de eliminação da conta e dados", "Account and data deletion request");

  const { data: existing, error: existingError } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("category", "privacy")
    .neq("status", "resolved")
    .eq("subject", subject)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    redirect(`/portal/support/${existing.id}?notice=${encodeURIComponent(tr(l,"Já existe um pedido de eliminação em aberto para esta organização.","There is already an open deletion request for this organisation."))}`);
  }

  const initialMessage = tr(
    l,
    `Solicito a eliminação da conta da organização ${session.organizationName} e dos dados operacionais/pessoais associados, sujeitos às obrigações legais e contratuais aplicáveis. Confirmei este pedido escrevendo o nome da organização no portal.`,
    `I request deletion of the ${session.organizationName} organisation account and associated operational/personal data, subject to applicable legal and contractual obligations. I confirmed this request by typing the organisation name in the portal.`,
  );

  const ticket = await createSupportTicket({
    organizationId: session.organizationId,
    openedByUserId: session.userId,
    openedByEmail: session.email,
    subject,
    category: "privacy",
    priority: "high",
    summary: tr(l, "O owner da organização submeteu um pedido confirmado de eliminação da conta e dados. Rever identidade, obrigações de conservação e exportação antes de apagar.", "The organisation owner submitted a confirmed account and data deletion request. Review identity, retention obligations and export needs before deletion."),
    initialMessage,
    context: [{ role: "user", content: initialMessage }],
  });

  try {
    await sendNewSupportTicketNotification({
      ticketId: ticket.id,
      organizationName: session.organizationName,
      openedByEmail: session.email,
      subject: ticket.subject,
      summary: ticket.ai_summary,
      category: ticket.category,
      priority: ticket.priority,
    });
  } catch (error) {
    console.error("[support-notification] Could not send deletion-request email:", error);
  }

  revalidatePath("/portal/support");
  redirect(`/portal/support/${ticket.id}?notice=${encodeURIComponent(tr(l,"Pedido de eliminação criado. A equipa vai rever o pedido antes de apagar dados.","Deletion request created. The team will review it before any data is erased."))}`);
}
