import Link from "next/link";
import CompactWebsiteLink from "@/app/_components/CompactWebsiteLink";
import { getConversations } from "@/lib/admin/data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default async function ConversationsPage() {
  const conversations = await getConversations();

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Histórico</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Conversas</h1>
      <p className="mt-2 text-sm text-white/40">Vê exatamente o que cada visitante falou com o Momo.</p>

      <div className="mt-7 space-y-3">
        {conversations.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-12 text-center text-sm text-white/35">Ainda não existem conversas.</div>
        )}

        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            href={`/admin/conversations/${conversation.id}`}
            className="block rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/20 hover:bg-[#171717]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{conversation.business_type || "Negócio por identificar"}</span>
                  <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase text-white/35">{conversation.language || "—"}</span>
                </div>
                <p className="mt-2 truncate text-sm text-white/45">{conversation.lastMessage || "Sem mensagens"}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30">
                  <span>{conversation.messageCount} mensagens</span>
                  {conversation.website && (
                    <CompactWebsiteLink
                      url={conversation.website}
                      clickable={false}
                      className="block min-w-0 max-w-full truncate"
                    />
                  )}
                </div>
              </div>
              <div className="text-xs text-white/30">{formatDate(conversation.updated_at)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
