import Link from "next/link";
import ConversationMessageText from "@/app/_components/ConversationMessageText";
import { notFound } from "next/navigation";
import { getClientConversation } from "@/lib/admin/client-conversations";
import { requirePortal } from "@/lib/portal/auth";
import { dateLocale, tr } from "@/lib/i18n/ui";

export default async function PortalConversationDetailPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const session = await requirePortal();
  const { conversationId } = await params;
  const { conversation, messages, lead } = await getClientConversation(session.organizationId, conversationId);
  if (!conversation) notFound();
  const l = session.language;
  const formatDate = (value: string) => new Intl.DateTimeFormat(dateLocale(l), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return (
    <div className="max-w-5xl">
      <Link href="/portal/conversations" className="text-sm text-white/40 transition hover:text-white">← {tr(l, "Conversas", "Conversations")}</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">{tr(l, "Conversa do widget", "Widget conversation")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{conversation.visitor_name || tr(l, "Visitante anónimo", "Anonymous visitor")}</h1>
          <p className="mt-2 text-sm text-white/35">{tr(l, "Iniciada em", "Started on")} {formatDate(conversation.created_at)}</p>
        </div>
        {lead && <span className="rounded-xl border border-[#ff7a18]/20 bg-[#ff7a18]/[0.06] px-4 py-2 text-sm text-[#ff9a4d]">{tr(l, "Lead captado", "Lead captured")}</span>}
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-4 sm:p-6"><div className="space-y-4">
          {messages.map((message) => { const user = message.role === "user"; return <div key={message.id} className={`flex ${user ? "justify-end" : "justify-start"}`}><div className={`min-w-0 max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-6 ${user ? "rounded-br-md bg-[#ff7a18] text-[#151515]" : "rounded-bl-md border border-white/[0.07] bg-white/[0.05] text-white/80"}`}><ConversationMessageText content={message.content} /><p className={`mt-2 text-[10px] ${user ? "text-black/45" : "text-white/25"}`}>{formatDate(message.created_at)}</p></div></div>; })}
        </div></section>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5"><p className="text-xs uppercase tracking-[0.14em] text-white/30">{tr(l, "Sessão", "Session")}</p><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs text-white/30">{tr(l, "Empresa", "Company")}</dt><dd className="mt-1 text-white/75">{session.organizationName}</dd></div><div><dt className="text-xs text-white/30">{tr(l, "Última atividade", "Last activity")}</dt><dd className="mt-1 text-white/60">{formatDate(conversation.updated_at)}</dd></div></dl></div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5"><p className="text-xs uppercase tracking-[0.14em] text-white/30">{tr(l, "Contacto captado", "Captured contact")}</p>{lead ? <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-white/30">{tr(l, "Nome", "Name")}</dt><dd className="mt-1 text-white/75">{lead.name || "—"}</dd></div><div><dt className="text-xs text-white/30">Email</dt><dd className="mt-1 break-all text-white/75">{lead.email || "—"}</dd></div><div><dt className="text-xs text-white/30">{tr(l, "Telefone", "Phone")}</dt><dd className="mt-1 text-white/75">{lead.phone || "—"}</dd></div><div><dt className="text-xs text-white/30">{tr(l, "Estado", "Status")}</dt><dd className="mt-1 capitalize text-[#ff9a4d]">{lead.status}</dd></div></dl> : <p className="mt-3 text-sm leading-6 text-white/35">{tr(l, "O visitante ainda não deixou email nem telefone.", "The visitor has not provided an email or phone number yet.")}</p>}</div>
        </aside>
      </div>
    </div>
  );
}
