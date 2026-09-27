import Link from "next/link";
import { getClientConversations } from "@/lib/admin/client-conversations";
import { requirePortal } from "@/lib/portal/auth";
import { dateLocale, tr } from "@/lib/i18n/ui";

export default async function PortalConversationsPage() {
  const session = await requirePortal();
  const conversations = await getClientConversations(session.organizationId);
  const l = session.language;
  const formatDate = (value: string) => new Intl.DateTimeFormat(dateLocale(l), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Widget</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr(l, "Conversas", "Conversations")}</h1>
          <p className="mt-2 text-sm text-white/40">{tr(l, `Histórico dos visitantes que falaram com o agente de ${session.organizationName}.`, `History of visitors who spoke with ${session.organizationName}'s agent.`)}</p>
        </div>
        <span className="rounded-full border border-white/[0.07] bg-[#151515] px-3 py-1.5 text-xs text-white/45">{conversations.length} {conversations.length === 1 ? tr(l, "conversa", "conversation") : tr(l, "conversas", "conversations")}</span>
      </div>

      <div className="mt-7 space-y-3">
        {conversations.length === 0 && <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-12 text-center text-sm text-white/40">{tr(l, "Ainda não existem conversas no widget.", "There are no widget conversations yet.")}</div>}
        {conversations.map((conversation) => (
          <Link key={conversation.id} href={`/portal/conversations/${conversation.id}`} className="block rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25 hover:bg-[#171717]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white/85">{conversation.visitor_name || tr(l, "Visitante anónimo", "Anonymous visitor")}</span>
                  {conversation.hasLead && <span className="rounded-full border border-[#ff7a18]/20 bg-[#ff7a18]/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#ff9a4d]">Lead</span>}
                  <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase text-white/30">{conversation.language || "—"}</span>
                </div>
                <p className="mt-2 truncate text-sm text-white/45">{conversation.lastMessage || tr(l, "Sem mensagens", "No messages")}</p>
                <p className="mt-3 text-xs text-white/25">{conversation.messageCount} {tr(l, "mensagens", "messages")}</p>
              </div>
              <div className="text-xs text-white/30">{formatDate(conversation.updated_at)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
