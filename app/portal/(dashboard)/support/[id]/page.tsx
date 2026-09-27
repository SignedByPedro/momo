import FormSubmitButton from "@/app/_components/FormSubmitButton";
import SupportTicketReadMarker from "@/components/support/SupportTicketReadMarker";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortal } from "@/lib/portal/auth";
import {
  getPortalSupportTicket,
  getSupportTicketMessages,
  supportCategoryLabel,
  supportStatusLabel,
  supportTicketReference,
} from "@/lib/support/tickets";
import { dateLocale, tr } from "@/lib/i18n/ui";
import { markSupportTicketResolved, replyToSupportTicket } from "../actions";

export default async function PortalSupportTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const session = await requirePortal();
  const { id } = await params;
  const query = await searchParams;
  const ticket = await getPortalSupportTicket(session.organizationId, id);
  if (!ticket) notFound();
  const messages = await getSupportTicketMessages(ticket.id);
  const lastSupportMessage = messages.filter((message) => message.author_type === "support").slice(-1)[0];
  const l = session.language;

  return (
    <div className="mx-auto max-w-4xl">
      <SupportTicketReadMarker area="portal" ticketId={ticket.id} lastMessageId={lastSupportMessage?.id ?? null} />
      <Link href="/portal/support" className="text-xs text-white/35 transition hover:text-white">← {tr(l, "Voltar ao suporte", "Back to support")}</Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#ff9b50]">{supportTicketReference(ticket.id)}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
          <p className="mt-2 text-xs text-white/35">{supportCategoryLabel(ticket.category, l)} · {new Date(ticket.created_at).toLocaleString(dateLocale(l))}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
          <span className="w-fit rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-white/60">{supportStatusLabel(ticket.status, l)}</span>
          {ticket.status !== "resolved" && (
            <form action={markSupportTicketResolved}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <FormSubmitButton type="submit" className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.14]">
                {tr(l, "Marcar como resolvido", "Mark as resolved")}
              </FormSubmitButton>
            </form>
          )}
        </div>
      </div>

      {query.notice && <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100/80">{query.notice}</div>}
      {query.error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">{query.error}</div>}

      {ticket.ai_summary && (
        <section className="mt-6 rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-white/30">{tr(l, "Resumo", "Summary")}</p>
          <p className="mt-2 text-sm leading-6 text-white/65">{ticket.ai_summary}</p>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
        <h2 className="text-sm font-semibold">{tr(l, "Conversa com a equipa", "Conversation with the team")}</h2>
        <div className="mt-5 space-y-4">
          {messages.map((message) => {
            const support = message.author_type === "support";
            return (
              <div key={message.id} className={`flex ${support ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${support ? "rounded-bl-md border border-white/[0.07] bg-white/[0.045]" : "rounded-br-md bg-[#ff7a18] text-[#17110d]"}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${support ? "text-white/30" : "text-black/45"}`}>{support ? "Momo Support" : message.author_email || tr(l, "Tu", "You")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  <p className={`mt-2 text-[10px] ${support ? "text-white/25" : "text-black/40"}`}>{new Date(message.created_at).toLocaleString(dateLocale(l))}</p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && <p className="text-sm text-white/35">{tr(l, "Ainda não existem mensagens neste pedido.", "There are no messages in this request yet.")}</p>}
        </div>

        <form action={replyToSupportTicket} className="mt-6 border-t border-white/[0.06] pt-5">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <label className="text-xs text-white/45" htmlFor="content">{tr(l, "Adicionar mensagem", "Add message")}</label>
          <textarea id="content" name="content" required maxLength={6000} rows={4} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#ff7a18]/35" placeholder={tr(l, "Acrescenta contexto ou responde à equipa...", "Add context or reply to the team...")} />
          <FormSubmitButton className="mt-3 rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#17110d] transition hover:bg-[#ff9348]">{tr(l, "Enviar mensagem", "Send message")}</FormSubmitButton>
          {ticket.status === "resolved" && (
            <p className="mt-3 text-xs text-white/35">
              {tr(l, "Se precisares de voltar a contactar-nos, envia uma mensagem para reabrir o pedido.", "If you need further help, send a message to reopen the request.")}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
