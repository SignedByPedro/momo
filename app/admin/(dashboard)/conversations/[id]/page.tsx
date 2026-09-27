import Link from "next/link";
import CompactWebsiteLink from "@/app/_components/CompactWebsiteLink";
import ConversationMessageText from "@/app/_components/ConversationMessageText";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/admin/StatusBadge";
import { getConversation } from "@/lib/admin/data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conversation, messages, lead } = await getConversation(id);
  if (!conversation) notFound();

  return (
    <div>
      <Link href="/admin/conversations" className="text-sm text-white/40 transition hover:text-white">← Conversas</Link>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <h1 className="text-lg font-semibold">{conversation.business_type || "Conversa"}</h1>
            <p className="mt-1 text-xs text-white/35">{formatDate(conversation.created_at)} · {messages.length} mensagens</p>
          </div>

          <div className="space-y-4 p-5">
            {messages.map((message) => {
              const user = message.role === "user";
              return (
                <div key={message.id} className={`flex ${user ? "justify-end" : "justify-start"}`}>
                  <div className={`min-w-0 max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${user ? "rounded-br-md bg-[#ff7a18] text-[#171717]" : "rounded-bl-md border border-white/[0.06] bg-[#212121] text-white/80"}`}>
                    <ConversationMessageText content={message.content} />
                    <p className={`mt-2 text-[10px] ${user ? "text-black/45" : "text-white/25"}`}>{formatDate(message.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">Contexto</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-xs text-white/30">Tipo de negócio</dt><dd className="mt-1 text-white/75">{conversation.business_type || "—"}</dd></div>
              <div><dt className="text-xs text-white/30">Website</dt><dd className="mt-1 min-w-0 text-white/75">{conversation.website ? (
                  <CompactWebsiteLink url={conversation.website} className="text-[#ff9a4d] hover:underline" />
                ) : "—"}</dd></div>
              <div><dt className="text-xs text-white/30">Idioma</dt><dd className="mt-1 uppercase text-white/75">{conversation.language || "—"}</dd></div>
            </dl>
          </div>

          {lead && (
            <div className="rounded-2xl border border-[#ff7a18]/15 bg-[#ff7a18]/[0.035] p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-[#ff9a4d]">Lead</p>
                <StatusBadge status={lead.status} />
              </div>
              <p className="mt-4 font-medium">{lead.name || "Sem nome"}</p>
              <p className="mt-1 text-sm text-white/55">{lead.email || lead.phone || "—"}</p>
              <Link href={`/admin/leads/${lead.id}`} className="mt-4 inline-block text-xs text-[#ff9a4d] hover:underline">Abrir lead →</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
