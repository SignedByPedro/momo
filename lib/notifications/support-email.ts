import { supportTicketReference, type SupportTicketCategory, supportCategoryLabel } from "@/lib/support/tickets";

type SupportNotificationInput = {
  ticketId: string;
  organizationName: string;
  openedByEmail: string;
  subject: string;
  summary: string | null;
  category: SupportTicketCategory;
  priority: "low" | "normal" | "high";
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function recipients() {
  return (process.env.SUPPORT_NOTIFICATION_TO ?? process.env.LEAD_NOTIFICATION_TO ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendNewSupportTicketNotification(input: SupportNotificationInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = recipients();
  if (!apiKey || to.length === 0) {
    console.warn("[support-notification] Skipped: email notifications are not configured.");
    return;
  }

  const from =
    process.env.SUPPORT_NOTIFICATION_FROM?.trim() ||
    process.env.LEAD_NOTIFICATION_FROM?.trim() ||
    "Momo <onboarding@resend.dev>";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const ticketUrl = appUrl ? `${appUrl}/admin/support/${input.ticketId}` : null;
  const reference = supportTicketReference(input.ticketId);

  const html = `
    <div style="margin:0;background:#0f0f0f;padding:32px 18px;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
      <div style="max-width:580px;margin:0 auto;border:1px solid #292929;border-radius:18px;background:#171717;padding:28px;">
        <div style="display:inline-block;margin-bottom:18px;border-radius:999px;background:#ff7a181a;padding:6px 10px;color:#ff9b50;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Momo · Support</div>
        <h1 style="margin:0 0 8px;font-size:23px;line-height:1.3;color:#fff;">Novo pedido ${escapeHtml(reference)}</h1>
        <p style="margin:0 0 20px;color:#a5a5a5;font-size:14px;line-height:1.6;">${escapeHtml(input.organizationName)} precisa de acompanhamento da equipa.</p>
        <p style="margin:0 0 8px;color:#fff;font-size:16px;font-weight:700;">${escapeHtml(input.subject)}</p>
        <p style="margin:0 0 18px;color:#aaa;font-size:14px;line-height:1.6;">${escapeHtml(input.summary || "Sem resumo automático.")}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 14px 6px 0;color:#777;font-size:12px;">Categoria</td><td style="color:#eee;font-size:13px;">${escapeHtml(supportCategoryLabel(input.category))}</td></tr>
          <tr><td style="padding:6px 14px 6px 0;color:#777;font-size:12px;">Prioridade</td><td style="color:#eee;font-size:13px;">${escapeHtml(input.priority)}</td></tr>
          <tr><td style="padding:6px 14px 6px 0;color:#777;font-size:12px;">Utilizador</td><td style="color:#eee;font-size:13px;">${escapeHtml(input.openedByEmail)}</td></tr>
        </table>
        ${ticketUrl ? `<a href="${escapeHtml(ticketUrl)}" style="display:inline-block;margin-top:22px;padding:12px 18px;border-radius:10px;background:#ff7a18;color:#171717;text-decoration:none;font-size:14px;font-weight:700;">Abrir pedido →</a>` : ""}
      </div>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `momo-support/${input.ticketId}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: `${reference} · ${input.organizationName} · ${input.subject}`,
      html,
      text: `${reference}\n${input.organizationName}\n${input.subject}\n${input.summary || ""}${ticketUrl ? `\n${ticketUrl}` : ""}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend returned ${response.status}${body ? `: ${body}` : ""}`);
  }
}

type SupportReplyNotificationInput = {
  ticketId: string;
  messageId: string;
  recipientEmail: string;
  organizationName: string;
  subject: string;
  reply: string;
  language: "pt" | "en";
};

export async function sendSupportReplyNotification(input: SupportReplyNotificationInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !input.recipientEmail.trim()) {
    console.warn("[support-notification] Skipped client reply email: email notifications are not configured.");
    return false;
  }

  const from =
    process.env.SUPPORT_NOTIFICATION_FROM?.trim() ||
    process.env.LEAD_NOTIFICATION_FROM?.trim() ||
    "Momo <onboarding@resend.dev>";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const ticketUrl = appUrl ? `${appUrl}/portal/support/${input.ticketId}` : null;
  const reference = supportTicketReference(input.ticketId);
  const english = input.language === "en";

  const heading = english ? "You have a new support reply" : "Tens uma nova resposta do suporte";
  const intro = english
    ? `${input.organizationName}, the Momo team replied to your support request.`
    : `${input.organizationName}, a equipa Momo respondeu ao teu pedido de suporte.`;
  const button = english ? "Open request →" : "Abrir pedido →";

  const html = `
    <div style="margin:0;background:#0f0f0f;padding:32px 18px;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
      <div style="max-width:580px;margin:0 auto;border:1px solid #292929;border-radius:18px;background:#171717;padding:28px;">
        <div style="display:inline-block;margin-bottom:18px;border-radius:999px;background:#ff7a181a;padding:6px 10px;color:#ff9b50;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Momo · Support</div>
        <h1 style="margin:0 0 8px;font-size:23px;line-height:1.3;color:#fff;">${escapeHtml(heading)}</h1>
        <p style="margin:0 0 18px;color:#a5a5a5;font-size:14px;line-height:1.6;">${escapeHtml(intro)}</p>
        <p style="margin:0 0 8px;color:#ff9b50;font-size:12px;font-weight:700;">${escapeHtml(reference)}</p>
        <p style="margin:0 0 16px;color:#fff;font-size:16px;font-weight:700;">${escapeHtml(input.subject)}</p>
        <div style="border-left:3px solid #ff7a18;background:#111;padding:14px 16px;border-radius:0 10px 10px 0;color:#ddd;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(input.reply)}</div>
        ${ticketUrl ? `<a href="${escapeHtml(ticketUrl)}" style="display:inline-block;margin-top:22px;padding:12px 18px;border-radius:10px;background:#ff7a18;color:#171717;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(button)}</a>` : ""}
      </div>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `momo-support-reply/${input.messageId}`,
    },
    body: JSON.stringify({
      from,
      to: [input.recipientEmail],
      subject: english
        ? `${reference} · New support reply`
        : `${reference} · Nova resposta do suporte`,
      html,
      text: `${heading}\n${reference} · ${input.subject}\n\n${input.reply}${ticketUrl ? `\n\n${ticketUrl}` : ""}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend returned ${response.status}${body ? `: ${body}` : ""}`);
  }

  return true;
}
