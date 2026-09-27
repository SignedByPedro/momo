import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { getAdminOverview } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { dateLocale, tr } from "@/lib/i18n/ui";

function formatDate(value: string, language: "pt" | "en") {
  return new Intl.DateTimeFormat(dateLocale(language), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const [admin, overview] = await Promise.all([requireAdmin(), getAdminOverview()]);
  const { leads, stats } = overview;
  const l = admin.language;

  return (
    <div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Dashboard</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr(l, "Visão geral", "Overview")}</h1>
        <p className="mt-2 text-sm text-white/40">{tr(l, "Acompanha leads, clientes e conversas do Momo.", "Track Momo leads, clients and conversations.")}</p>
      </div>

      {notice && (
        <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">
          {notice}
        </div>
      )}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr(l, "Total de leads", "Total leads")} value={stats.totalLeads} note={tr(l, `${stats.leadsToday} hoje`, `${stats.leadsToday} today`)} />
        <StatCard label={tr(l, "Novos", "New")} value={stats.newLeads} note={tr(l, "Aguardam contacto", "Awaiting contact")} />
        <StatCard label={tr(l, "Clientes", "Clients")} value={stats.wonLeads} note={tr(l, "Marcados como ganhos", "Marked as won")} />
        <StatCard label={tr(l, "Conversas", "Conversations")} value={stats.conversations} note={tr(l, "Sessões registadas", "Recorded sessions")} />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold">{tr(l, "Leads recentes", "Recent leads")}</h2>
          <span className="text-xs text-white/30">{tr(l, `${leads.length} total`, `${leads.length} total`)}</span>
        </div>

        {leads.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-white/35">{tr(l, "Ainda não existem leads.", "There are no leads yet.")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-white/30">
                <tr>
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">{tr(l, "Negócio", "Business")}</th>
                  <th className="px-5 py-3 font-medium">Website</th>
                  <th className="px-5 py-3 font-medium">{tr(l, "Estado", "Status")}</th>
                  <th className="px-5 py-3 font-medium">{tr(l, "Data", "Date")}</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {leads.map((lead) => (
                  <tr key={lead.id} className="transition hover:bg-white/[0.018]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white/90">{lead.name || tr(l, "Sem nome", "No name")}</div>
                      <div className="mt-1 text-xs text-white/40">{lead.email || lead.phone || tr(l, "Sem contacto", "No contact")}</div>
                    </td>
                    <td className="px-5 py-4 text-white/60">{lead.business_type || "—"}</td>
                    <td className="px-5 py-4 text-white/45">{lead.website || "—"}</td>
                    <td className="px-5 py-4"><StatusBadge status={lead.status} language={l} /></td>
                    <td className="px-5 py-4 text-xs text-white/40">{formatDate(lead.created_at, l)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/leads/${lead.id}`} className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs text-white/60 transition hover:border-[#ff7a18]/30 hover:text-[#ff9a4d]">
                        {tr(l, "Abrir", "Open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
