"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { sendSupportReplyNotification } from "@/lib/notifications/support-email";
import {
  addSupportTicketMessage,
  getAdminSupportTicket,
  setSupportTicketStatus,
  type SupportTicketStatus,
} from "@/lib/support/tickets";

function clean(value: FormDataEntryValue | null, max = 6000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function replyAsSupport(formData: FormData) {
  const admin = await requireAdmin();
  const ticketId = clean(formData.get("ticketId"), 100);
  const content = clean(formData.get("content"));
  if (!ticketId || !content) redirect(`/admin/support/${ticketId}?error=${encodeURIComponent("Escreve uma resposta antes de enviar.")}`);

  const ticket = await getAdminSupportTicket(ticketId);
  if (!ticket) redirect(`/admin/support?error=${encodeURIComponent("Pedido não encontrado.")}`);

  const message = await addSupportTicketMessage({
    ticketId,
    organizationId: ticket.organization_id,
    authorType: "support",
    authorUserId: admin.userId,
    authorEmail: admin.email,
    content,
  });

  let emailSent = false;
  if (message) {
    try {
      emailSent = await sendSupportReplyNotification({
        ticketId,
        messageId: message.id,
        recipientEmail: ticket.opened_by_email,
        organizationName: ticket.organization_name,
        subject: ticket.subject,
        reply: content,
        language: ticket.organization_primary_language,
      });
    } catch (error) {
      console.error("[support-notification] Could not send client reply email:", error);
    }
  }

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/portal/support");
  revalidatePath(`/portal/support/${ticketId}`);
  const notice = emailSent
    ? "Resposta guardada no portal e cliente notificado por email."
    : "Resposta guardada no portal. Não foi possível confirmar a notificação por email.";
  redirect(`/admin/support/${ticketId}?notice=${encodeURIComponent(notice)}`);
}

export async function updateSupportStatus(formData: FormData) {
  await requireAdmin();
  const ticketId = clean(formData.get("ticketId"), 100);
  const raw = clean(formData.get("status"), 30);
  const status: SupportTicketStatus = raw === "resolved" ? "resolved" : raw === "in_progress" ? "in_progress" : "new";
  const ticket = await getAdminSupportTicket(ticketId);
  if (!ticket) redirect(`/admin/support?error=${encodeURIComponent("Pedido não encontrado.")}`);

  await setSupportTicketStatus(ticketId, status);
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/portal/support");
  revalidatePath(`/portal/support/${ticketId}`);
  redirect(`/admin/support/${ticketId}?notice=${encodeURIComponent("Estado atualizado com sucesso.")}`);
}
