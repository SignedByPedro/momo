import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import { getClientConversationStats } from "@/lib/admin/client-conversations";
import { getClientKnowledgeStats } from "@/lib/admin/client-knowledge";
import { getClientWidgetConfig } from "@/lib/admin/widgets";
import { requirePortal } from "@/lib/portal/auth";
import { getPortalLeadStats } from "@/lib/portal/data";
import { tr } from "@/lib/i18n/ui";

export default async function PortalDashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requirePortal();
  const query = await searchParams;
  const [conversationStats, leadStats, knowledgeStats, widget] = await Promise.all([
    getClientConversationStats(session.organizationId),
    getPortalLeadStats(session.organizationId),
    getClientKnowledgeStats(session.organizationId),
    getClientWidgetConfig(session.organizationId),
  ]);
  const l = session.language;

  return (
    <div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">{session.organizationName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-white/40">{tr(l, "Acompanha o teu agente sem acesso às áreas internas da plataforma.", "Monitor your agent without access to the platform's internal areas.")}</p>
      </div>

      {query.error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">{query.error}</div>}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr(l, "Conversas", "Conversations")} value={conversationStats.conversations} note={tr(l, "Sessões no widget", "Widget sessions")} />
        <StatCard label="Leads" value={leadStats.total} note={tr(l, `${leadStats.new} novos`, `${leadStats.new} new`)} />
        <StatCard label={tr(l, "Conhecimento", "Knowledge")} value={knowledgeStats.total} note={tr(l, `${knowledgeStats.indexed} indexadas`, `${knowledgeStats.indexed} indexed`)} />
        <StatCard label="Widget" value={widget?.is_enabled ? tr(l, "Ativo", "Active") : "Off"} note={widget?.is_enabled ? tr(l, "Publicado", "Published") : tr(l, "Não publicado", "Not published")} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/portal/conversations" className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25">
          <p className="font-medium">{tr(l, "Conversas", "Conversations")}</p><p className="mt-2 text-sm leading-6 text-white/40">{tr(l, "Lê o histórico real dos visitantes do website.", "Review the real conversation history from website visitors.")}</p>
        </Link>
        <Link href="/portal/leads" className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25">
          <p className="font-medium">Leads</p><p className="mt-2 text-sm leading-6 text-white/40">{tr(l, "Consulta e acompanha contactos captados pelo agente.", "Review and track contacts captured by the agent.")}</p>
        </Link>
        <Link href="/portal/support" className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25">
          <p className="font-medium">Support</p><p className="mt-2 text-sm leading-6 text-white/40">{tr(l, "Fala com o Momo Support 24/7 ou acompanha pedidos enviados para a equipa.", "Chat with Momo Support 24/7 or track requests sent to the team.")}</p>
        </Link>
        {session.role === "client_owner" && (
          <>
            <Link href="/portal/knowledge" className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25"><p className="font-medium">{tr(l, "Conhecimento", "Knowledge")}</p><p className="mt-2 text-sm leading-6 text-white/40">{tr(l, "Atualiza FAQs e informação usada nas respostas.", "Update FAQs and information used in replies.")}</p></Link>
            <Link href="/portal/agent" className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25"><p className="font-medium">{tr(l, "Agente", "Agent")}</p><p className="mt-2 text-sm leading-6 text-white/40">{tr(l, "Configura objetivo, tom e comportamento.", "Configure its objective, tone and behaviour.")}</p></Link>
            <Link href="/portal/widget" className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25"><p className="font-medium">Widget</p><p className="mt-2 text-sm leading-6 text-white/40">{tr(l, "Personaliza aparência e instalação.", "Customize appearance and installation.")}</p></Link>
          </>
        )}
      </section>
    </div>
  );
}
