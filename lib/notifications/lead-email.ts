type LeadNotificationInput = {
  leadId: string;
  conversationId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  businessType: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function notificationRecipients() {
  return (process.env.LEAD_NOTIFICATION_TO ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendNewMomoLeadNotification(input: LeadNotificationInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipients = notificationRecipients();

  // Notifications are optional in local development. Never make lead capture fail
  // just because email has not been configured yet.
  if (!apiKey || recipients.length === 0) {
    console.warn(
      "[lead-notification] Skipped: RESEND_API_KEY or LEAD_NOTIFICATION_TO is missing.",
    );
    return;
  }

  const from =
    process.env.LEAD_NOTIFICATION_FROM?.trim() ||
    "Momo <onboarding@resend.dev>";

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const leadUrl = appUrl ? `${appUrl}/admin/leads/${input.leadId}` : null;

  const subjectName = input.name?.trim() || input.email?.trim() || input.phone?.trim();
  const subject = subjectName
    ? `Novo lead no Momo — ${subjectName}`
    : "Novo lead no Momo";

  const rows = [
    ["Nome", display(input.name)],
    ["Email", display(input.email)],
    ["Telefone", display(input.phone)],
    ["Negócio", display(input.businessType)],
    ["Website", display(input.website)],
  ] as const;

  const detailsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 18px 8px 0;color:#8f8f8f;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#f5f5f5;font-size:14px;word-break:break-word;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const buttonHtml = leadUrl
    ? `<a href="${escapeHtml(leadUrl)}" style="display:inline-block;margin-top:22px;padding:12px 18px;border-radius:10px;background:#ff7a18;color:#171717;text-decoration:none;font-size:14px;font-weight:700;">Abrir lead no Admin →</a>`
    : "";

  const html = `
    <div style="margin:0;background:#0f0f0f;padding:32px 18px;font-family:Inter,Arial,sans-serif;color:#f5f5f5;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #292929;border-radius:18px;background:#171717;padding:28px;">
        <div style="display:inline-block;margin-bottom:18px;border-radius:999px;background:#ff7a181a;padding:6px 10px;color:#ff9b50;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Momo · Nova lead</div>
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;color:#ffffff;">Entrou uma nova oportunidade 👋</h1>
        <p style="margin:0 0 22px;color:#a5a5a5;font-size:14px;line-height:1.6;">Um visitante deixou contacto através do Momo comercial.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">${detailsHtml}</table>
        ${buttonHtml}
        <p style="margin:24px 0 0;color:#616161;font-size:11px;line-height:1.5;">Conversation ID: ${escapeHtml(input.conversationId)}</p>
      </div>
    </div>`;

  const text = [
    "Novo lead no Momo",
    "",
    `Nome: ${display(input.name)}`,
    `Email: ${display(input.email)}`,
    `Telefone: ${display(input.phone)}`,
    `Negócio: ${display(input.businessType)}`,
    `Website: ${display(input.website)}`,
    leadUrl ? `Abrir no Admin: ${leadUrl}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `momo-lead/${input.leadId}`,
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Resend returned ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
    );
  }
}
