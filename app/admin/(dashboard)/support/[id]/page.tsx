import FormSubmitButton from "@/app/_components/FormSubmitButton";
import SupportTicketReadMarker from "@/components/support/SupportTicketReadMarker";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getAdminSupportTicket,
  getSupportTicketMessages,
  supportCategoryLabel,
  supportStatusLabel,
  supportTicketReference,
} from "@/lib/support/tickets";
import { replyAsSupport, updateSupportStatus } from "../actions";

export default async function AdminSupportTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const ticket = await getAdminSupportTicket(id);
  if (!ticket) notFound();
  const messages = await getSupportTicketMessages(ticket.id);
  const lastClientMessage = messages.filter((message) => message.author_type === "client").slice(-1)[0];

  return (
    <div className="mx-auto max-w-5xl">
      <SupportTicketReadMarker area="admin" ticketId={ticket.id} lastMessageId={lastClientMessage?.id ?? null} />
      <Link href="/admin/support" className="text-xs text-white/35 transition hover:text-white">← Voltar ao support</Link>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#ff9b50]">{supportTicketReference(ticket.id)}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
          <p className="mt-2 text-xs text-white/35">{ticket.organization_name} · {ticket.opened_by_email} · {supportCategoryLabel(ticket.category)}</p>
        </div>
        <form action={updateSupportStatus} className="flex items-center gap-2">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <select name="status" defaultValue={ticket.status} className="rounded-xl border border-white/[0.08] bg-[#151515] px-3 py-2 text-xs text-white outline-none">
            <option value="new">Novo</option>
            <option value="in_progress">Em análise</option>
            <option value="resolved">Resolvido</option>
          </select>
          <FormSubmitButton className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/60 transition hover:bg-white/[0.05] hover:text-white">Guardar</FormSubmitButton>
        </form>
      </div>

      {query.notice && <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100/80">{query.notice}</div>}
      {query.error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">{query.error}</div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Conversa</h2><span className="text-xs text-white/30">{supportStatusLabel(ticket.status)}</span></div>
          <div className="mt-5 space-y-4">
            {messages.map((message) => {
              const support = message.author_type === "support";
              return (
                <div key={message.id} className={`flex ${support ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${support ? "rounded-br-md bg-[#ff7a18] text-[#17110d]" : "rounded-bl-md border border-white/[0.07] bg-white/[0.045]"}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${support ? "text-black/45" : "text-white/30"}`}>{support ? "Momo Support" : message.author_email || "Cliente"}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    <p className={`mt-2 text-[10px] ${support ? "text-black/40" : "text-white/25"}`}>{new Date(message.created_at).toLocaleString("pt-PT")}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <form action={replyAsSupport} className="mt-6 border-t border-white/[0.06] pt-5">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <textarea name="content" required maxLength={6000} rows={4} className="w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#ff7a18]/35" placeholder="Responder ao cliente no portal..." />
            <FormSubmitButton className="mt-3 rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#17110d] transition hover:bg-[#ff9348]">Enviar resposta</FormSubmitButton>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">Resumo IA</p>
            <p className="mt-3 text-sm leading-6 text-white/60">{ticket.ai_summary || "—"}</p>
            <dl className="mt-5 space-y-3 border-t border-white/[0.06] pt-4 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-white/30">Prioridade</dt><dd className="text-white/60">{ticket.priority}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/30">Criado</dt><dd className="text-right text-white/60">{new Date(ticket.created_at).toLocaleString("pt-PT")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/30">Atualizado</dt><dd className="text-right text-white/60">{new Date(ticket.updated_at).toLocaleString("pt-PT")}</dd></div>
            </dl>
          </section>

          {Array.isArray(ticket.context_snapshot) && ticket.context_snapshot.length > 0 && (
            <section className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-white/30">Contexto do Momo Support</p>
              <div className="mt-4 space-y-3">
                {ticket.context_snapshot.map((message, index) => (
                  <div key={`${message.role}-${index}`} className="rounded-xl bg-white/[0.035] p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">{message.role === "user" ? "Cliente" : "Momo"}</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">{message.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
