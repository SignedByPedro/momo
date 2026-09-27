import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganization } from "@/lib/admin/organizations";
import { getClientConversations } from "@/lib/admin/client-conversations";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ClientConversationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getOrganization(id);
  if (!client) notFound();

  const conversations = await getClientConversations(id);

  return (
    <div className="max-w-5xl">
      <Link
        href={`/admin/clients/${id}`}
        className="text-sm text-white/40 transition hover:text-white"
      >
        ← {client.name}
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">
            Widget
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Conversas</h1>
          <p className="mt-2 text-sm text-white/40">
            Conversas reais dos visitantes no widget de {client.name}.
          </p>
        </div>
        <div className="rounded-full border border-white/[0.07] bg-[#151515] px-3 py-1.5 text-xs text-white/45">
          {conversations.length} {conversations.length === 1 ? "conversa" : "conversas"}
        </div>
      </div>

      <div className="mt-7 space-y-3">
        {conversations.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-12 text-center">
            <p className="text-sm text-white/45">Ainda não existem conversas no widget.</p>
            <p className="mt-2 text-xs text-white/25">
              Assim que alguém falar com o agente no website, a conversa aparece aqui.
            </p>
          </div>
        )}

        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            href={`/admin/clients/${id}/conversations/${conversation.id}`}
            className="block rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25 hover:bg-[#171717]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white/85">
                    {conversation.visitor_name || "Visitante anónimo"}
                  </span>
                  {conversation.hasLead && (
                    <span className="rounded-full border border-[#ff7a18]/20 bg-[#ff7a18]/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#ff9a4d]">
                      Lead
                    </span>
                  )}
                  <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase text-white/30">
                    {conversation.language || "—"}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-white/45">
                  {conversation.lastMessage || "Sem mensagens"}
                </p>
                <p className="mt-3 text-xs text-white/25">
                  {conversation.messageCount} mensagens
                </p>
              </div>
              <div className="text-xs text-white/30">
                {formatDate(conversation.updated_at)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
