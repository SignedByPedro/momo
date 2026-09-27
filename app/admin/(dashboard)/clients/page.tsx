import Link from "next/link";
import OrganizationStatusBadge from "@/components/admin/OrganizationStatusBadge";
import StatCard from "@/components/admin/StatCard";
import { getArchivedClientCount, getOrganizations } from "@/lib/admin/organizations";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(new Date(value));
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const [clients, archivedCount] = await Promise.all([getOrganizations(), getArchivedClientCount()]);
  const active = clients.filter((client) => client.status === "active").length;
  const setup = clients.filter((client) => client.status === "setup").length;
  const paused = clients.filter((client) => client.status === "paused").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Multiempresa</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Cada cliente terá a sua própria organização, conhecimento, agente, conversas e integrações.
          </p>
        </div>

        <Link href="/admin/clients/new" className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
          + Novo cliente
        </Link>
      </div>

      {notice && (
        <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">{notice}</div>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total histórico" value={clients.length + archivedCount} note={`${clients.length} atuais · ${archivedCount} anteriores`} />
        <StatCard label="Ativos" value={active} note="Em produção" />
        <StatCard label="Configuração" value={setup} note="Ainda a preparar" />
        <StatCard label="Pausados" value={paused} note="Serviço suspenso" />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold">Organizações</h2>
          <span className="text-xs text-white/30">{clients.length} total</span>
        </div>

        {clients.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm text-white/40">Ainda não criaste nenhum cliente.</p>
            <Link href="/admin/clients/new" className="mt-4 inline-flex rounded-xl border border-[#ff7a18]/25 px-4 py-2.5 text-sm text-[#ff9a4d] transition hover:bg-[#ff7a18]/[0.06]">
              Criar o primeiro cliente
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-white/30">
                <tr>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Idioma</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Criado</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {clients.map((client) => (
                  <tr key={client.id} className="transition hover:bg-white/[0.018]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white/90">{client.name}</div>
                      <div className="mt-1 max-w-[320px] truncate text-xs text-white/40">{client.website || client.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-white/60">{client.business_type || "—"}</td>
                    <td className="px-5 py-4 uppercase text-white/55">{client.primary_language}</td>
                    <td className="px-5 py-4"><OrganizationStatusBadge status={client.status} /></td>
                    <td className="px-5 py-4 text-xs text-white/40">{formatDate(client.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/clients/${client.id}`} className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs text-white/60 transition hover:border-[#ff7a18]/30 hover:text-[#ff9a4d]">
                        Abrir
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
