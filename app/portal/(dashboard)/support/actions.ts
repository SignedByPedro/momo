"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePortal } from "@/lib/portal/auth";
import {
  addSupportTicketMessage,
  createSupportTicket,
  getPortalSupportTicket,
  resolvePortalSupportTicket,
  type SupportTicketCategory,
} from "@/lib/support/tickets";
import { tr } from "@/lib/i18n/ui";
import { sendNewSupportTicketNotification } from "@/lib/notifications/support-email";

function clean(value: FormDataEntryValue | null, max = 6000) {
  return String(value ?? "").trim().slice(0, max);
}


const SUPPORT_CATEGORIES = new Set<SupportTicketCategory>([
  "general",
  "technical",
  "integration",
  "feature",
  "billing",
  "account",
  "privacy",
]);

export async function createManualSupportTicket(formData: FormData) {
  const session = await requirePortal();
  const subject = clean(formData.get("subject"), 180);
  const message = clean(formData.get("message"), 6000);
  const categoryRaw = clean(formData.get("category"), 40) as SupportTicketCategory;
  const category: SupportTicketCategory = SUPPORT_CATEGORIES.has(categoryRaw) ? categoryRaw : "general";

  if (!subject || !message) {
    redirect(`/portal/support/new?error=${encodeURIComponent(tr(session.language, "Preenche o assunto e a mensagem.", "Fill in the subject and message."))}`);
  }

  const ticket = await createSupportTicket({
    organizationId: session.organizationId,
    openedByUserId: session.userId,
    openedByEmail: session.email,
    subject,
    category,
    priority: "normal",
    summary: message.slice(0, 1200),
    initialMessage: message,
    context: [],
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
    console.error("[support-notification] Could not send manual ticket email:", error);
  }

  revalidatePath("/portal/support");
  revalidatePath("/admin/support");
  redirect(`/portal/support/${ticket.id}?notice=${encodeURIComponent(tr(session.language, "Ticket criado e enviado para a equipa.", "Ticket created and sent to the team."))}`);
}

export async function replyToSupportTicket(formData: FormData) {
  const session = await requirePortal();
  const ticketId = clean(formData.get("ticketId"), 100);
  const content = clean(formData.get("content"));

  if (!ticketId || !content) {
    redirect(`/portal/support/${ticketId}?error=${encodeURIComponent(tr(session.language, "Escreve uma mensagem antes de enviar.", "Write a message before sending."))}`);
  }

  const ticket = await getPortalSupportTicket(session.organizationId, ticketId);
  if (!ticket) {
    redirect(`/portal/support?error=${encodeURIComponent(tr(session.language, "Pedido não encontrado.", "Request not found."))}`);
  }

  await addSupportTicketMessage({
    ticketId,
    organizationId: session.organizationId,
    authorType: "client",
    authorUserId: session.userId,
    authorEmail: session.email,
    content,
  });

  revalidatePath("/portal/support");
  revalidatePath(`/portal/support/${ticketId}`);
  redirect(`/portal/support/${ticketId}?notice=${encodeURIComponent(tr(session.language, "Mensagem enviada para a equipa.", "Message sent to the team."))}`);
}

/** Allow any authenticated organization member to resolve their own company's ticket. */
export async function markSupportTicketResolved(formData: FormData) {
  const session = await requirePortal();
  const ticketId = clean(formData.get("ticketId"), 100);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    redirect(`/portal/support?error=${encodeURIComponent(tr(session.language, "Pedido inválido.", "Invalid request."))}`);
  }

  // Read with the authenticated organization ID. Never trust an organization
  // identifier supplied by the browser, even if the user guesses a valid ID.
  const ticket = await getPortalSupportTicket(session.organizationId, ticketId);
  if (!ticket) {
    redirect(`/portal/support?error=${encodeURIComponent(tr(session.language, "Pedido não encontrado.", "Request not found."))}`);
  }

  if (ticket.status === "resolved") {
    redirect(`/portal/support/${ticketId}?notice=${encodeURIComponent(tr(session.language, "Este pedido já está resolvido.", "This request is already resolved."))}`);
  }

  const changed = await resolvePortalSupportTicket(session.organizationId, ticketId);
  revalidatePath("/portal/support");
  revalidatePath(`/portal/support/${ticketId}`);
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  const notice = changed
    ? tr(session.language, "Pedido marcado como resolvido.", "Request marked as resolved.")
    : tr(session.language, "Este pedido já está resolvido.", "This request is already resolved.");
  redirect(`/portal/support/${ticketId}?notice=${encodeURIComponent(notice)}`);
}
