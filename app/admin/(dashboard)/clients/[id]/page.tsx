import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { legalConfig } from "@/app/legal/legal-config";
import OrganizationStatusBadge, { organizationStatusLabel } from "@/components/admin/OrganizationStatusBadge";
import { getClientKnowledgeStats } from "@/lib/admin/client-knowledge";
import { getClientConversationStats } from "@/lib/admin/client-conversations";
import { getOrganizationMemberUsage } from "@/lib/admin/members";
import { getOrganization, type OrganizationStatus } from "@/lib/admin/organizations";
import { getServerTimeMs } from "@/lib/server-time";
import { organizationPlanLabel, organizationPlanOptions } from "@/lib/plans";
import {
  deleteClient,
  reactivateClient,
  scheduleClientTermination,
  updateClient,
} from "../actions";

const statuses: Array<{ value: OrganizationStatus; label: string }> = [
  { value: "setup", label: "Configuração" },
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const client = await getOrganization(id);
  if (!client) notFound();
  const [knowledgeStats, conversationStats, memberUsage] = await Promise.all([
    getClientKnowledgeStats(id),
    getClientConversationStats(id),
    getOrganizationMemberUsage(id),
  ]);

  const serverNow = getServerTimeMs();
  const recoveryExpired = Boolean(
    client.status === "cancelled" &&
      client.recovery_until &&
      new Date(client.recovery_until).getTime() <= serverNow,
  );
  const inRecovery = client.status === "cancelled" && !recoveryExpired;
  const purgeDue = client.status === "purge_due" || recoveryExpired;
  const inTerminationFlow = client.status === "cancelled" || client.status === "purge_due";

  return (
    <div className="max-w-5xl">
      <Link href="/admin/clients" className="text-sm text-white/40 transition hover:text-white">← Clientes</Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Organização</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-2 text-sm text-white/40">Criado em {formatDate(client.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#ff7a18]/20 bg-[#ff7a18]/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#ffad6b]">
            {organizationPlanLabel(client.plan)}
          </span>
          <OrganizationStatusBadge status={client.status} />
        </div>
      </div>

      {query.notice && (
        <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">
          {query.notice}
        </div>
      )}
      {query.error && (
        <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">
          {query.error}
        </div>
      )}

      {inTerminationFlow && (
        <section className={`mt-6 rounded-2xl border px-5 py-4 ${purgeDue ? "border-red-400/20 bg-red-400/[0.05]" : "border-sky-400/20 bg-sky-400/[0.05]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs uppercase tracking-[0.14em] ${purgeDue ? "text-red-200/70" : "text-sky-200/70"}`}>
                {purgeDue ? "Janela de recuperação terminada" : "Janela de recuperação ativa"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {purgeDue
                  ? "O prazo de recuperação terminou. O cliente está pendente de eliminação final e o serviço permanece bloqueado."
                  : `O serviço está encerrado e pode ser reativado até ${client.recovery_until ? formatDate(client.recovery_until) : "à data definida"}. O portal está em modo de recuperação e o widget público está indisponível.`}
              </p>
            </div>
            {inRecovery && (
              <form action={reactivateClient}>
                <input type="hidden" name="id" value={client.id} />
                <FormSubmitButton className="rounded-xl border border-sky-400/25 px-4 py-2.5 text-sm font-semibold text-sky-100/85 transition hover:bg-sky-400/[0.08]">
                  Reativar cliente
                </FormSubmitButton>
              </form>
            )}
          </div>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-white/30">Encerrado em</dt><dd className="mt-1 text-white/65">{client.terminated_at ? formatDate(client.terminated_at) : "—"}</dd></div>
            <div><dt className="text-white/30">Recuperação até</dt><dd className="mt-1 text-white/65">{client.recovery_until ? formatDate(client.recovery_until) : "—"}</dd></div>
            <div><dt className="text-white/30">Estado anterior</dt><dd className="mt-1 text-white/65">{client.status_before_termination ? organizationStatusLabel(client.status_before_termination) : "—"}</dd></div>
            <div><dt className="text-white/30">Processado por</dt><dd className="mt-1 break-all text-white/65">{client.terminated_by_email ?? "—"}</dd></div>
          </dl>
          {client.termination_reason && (
            <p className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-xs leading-5 text-white/45">
              Motivo: {client.termination_reason}
            </p>
          )}
        </section>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Dados do cliente</h2>
            <p className="mt-1 text-xs text-white/35">Informação base usada para identificar e configurar esta organização.</p>
          </div>

          <form action={updateClient} className="mt-6 grid gap-5">
            <input type="hidden" name="id" value={client.id} />

            <label className="grid gap-2 text-xs text-white/45">
              Nome da empresa
              <input name="name" defaultValue={client.name} required maxLength={160} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>

            <label className="grid gap-2 text-xs text-white/45">
              Website
              <input name="website" defaultValue={client.website ?? ""} inputMode="url" maxLength={500} placeholder="https://..." className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-white/45">
                Tipo de negócio
                <input name="businessType" defaultValue={client.business_type ?? ""} maxLength={120} placeholder="Ex.: Ginásio" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
              </label>

              <label className="grid gap-2 text-xs text-white/45">
                País
                <input name="country" defaultValue={client.country ?? ""} maxLength={120} placeholder="Ex.: Portugal" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-white/45">
                Idioma principal
                <select name="primaryLanguage" defaultValue={client.primary_language} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                </select>
              </label>

              <label className="grid gap-2 text-xs text-white/45">
                Estado
                {inTerminationFlow ? (
                  <>
                    <input type="hidden" name="status" value={client.status} />
                    <div className="flex min-h-11 items-center rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white/55">
                      {organizationStatusLabel(client.status)}
                    </div>
                  </>
                ) : (
                  <select name="status" defaultValue={client.status} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                    {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                )}
              </label>
            </div>

            <label className="grid gap-2 text-xs text-white/45">
              Plano
              <select name="plan" defaultValue={client.plan} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                {organizationPlanOptions.map((plan) => (
                  <option key={plan.value} value={plan.value}>{plan.label} — {plan.description}</option>
                ))}
              </select>
              <span className="text-[11px] leading-5 text-white/25">
                Upgrade e downgrade aplicam-se imediatamente no Portal. Um downgrade não apaga configurações ou dados Premium, apenas bloqueia o acesso até um futuro upgrade.
              </span>
            </label>

            <label className="grid gap-2 text-xs text-white/45 sm:max-w-xs">
              Limite de utilizadores no portal
              <input name="memberLimit" type="number" min={Math.max(1, memberUsage.used)} max={1000} defaultValue={client.member_limit} required className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
              <span className="text-[11px] leading-5 text-white/25">Conta owners, members e convites pendentes. Em uso: {memberUsage.used}/{memberUsage.limit}.</span>
            </label>

            <div>
              <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
                Guardar alterações
              </FormSubmitButton>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">Identificação técnica</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-white/30">Slug</dt>
                <dd className="mt-1 break-all font-mono text-xs text-white/70">{client.slug}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/30">Organization ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-white/55">{client.id}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-[#ff7a18]/15 bg-[#ff7a18]/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-[#ff9a4d]">Configuração do produto</p>
            <div className="mt-4 space-y-3 text-sm">
              <Link href={`/admin/clients/${client.id}/knowledge`} className="block rounded-xl border border-[#ff7a18]/15 bg-[#101010] p-3 transition hover:border-[#ff7a18]/35">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white/80">Knowledge Base</p>
                  <span className="text-xs text-[#ff9a4d]">Abrir →</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/35">{knowledgeStats.total} entradas · {knowledgeStats.indexed} indexadas</p>
              </Link>
              <Link href={`/admin/clients/${client.id}/agent`} className="block rounded-xl border border-[#ff7a18]/15 bg-[#101010] p-3 transition hover:border-[#ff7a18]/35">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white/80">Agente</p>
                  <span className="text-xs text-[#ff9a4d]">Configurar →</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/35">Nome, tom, idiomas, fallback e ambiente de teste.</p>
              </Link>
              <Link href={`/admin/clients/${client.id}/widget`} className="block rounded-xl border border-[#ff7a18]/15 bg-[#101010] p-3 transition hover:border-[#ff7a18]/35">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white/80">Widget</p>
                  <span className="text-xs text-[#ff9a4d]">Personalizar →</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/35">Cores, avatar, posição, tamanho e preview ao vivo.</p>
              </Link>
              <Link href={`/admin/clients/${client.id}/conversations`} className="block rounded-xl border border-[#ff7a18]/15 bg-[#101010] p-3 transition hover:border-[#ff7a18]/35">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white/80">Conversas</p>
                  <span className="text-xs text-[#ff9a4d]">Ver →</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/35">{conversationStats.conversations} conversas · {conversationStats.leads} leads captados no widget.</p>
              </Link>
              <Link href={`/admin/clients/${client.id}/access`} className="block rounded-xl border border-[#ff7a18]/15 bg-[#101010] p-3 transition hover:border-[#ff7a18]/35">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white/80">Acessos</p>
                  <span className="text-xs text-[#ff9a4d]">Gerir →</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/35">Convida owners e membros para o portal privado desta organização. {memberUsage.used}/{memberUsage.limit} acessos em uso.</p>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {!inTerminationFlow && (
        <section className="mt-7 rounded-3xl border border-sky-400/15 bg-sky-400/[0.025] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.14em] text-sky-200/70">Encerramento do serviço</p>
          <h2 className="mt-2 text-lg font-semibold">Iniciar janela de recuperação</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
            Para um cancelamento normal, o portal passa para modo de recuperação e o widget público fica indisponível durante {legalConfig.cancellationRecoveryDays} dias. Os dados não são apagados nesse período e o cliente pode ser reativado sem reconstruir a conta.
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/30">
            Não uses este fluxo para um pedido explícito de eliminação de dados. Esses pedidos continuam a ser tratados através do ticket de Privacidade e podem exigir eliminação mais cedo.
          </p>
          <form action={scheduleClientTermination} className="mt-5 grid max-w-3xl gap-3">
            <input type="hidden" name="id" value={client.id} />
            <textarea name="reason" rows={3} maxLength={500} placeholder="Motivo do cancelamento (opcional)" className="rounded-xl border border-sky-400/15 bg-[#101010] px-3 py-3 text-sm text-white outline-none focus:border-sky-400/35" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <input name="confirmation" required placeholder={`Escreve ${client.name} para confirmar`} className="min-h-11 flex-1 rounded-xl border border-sky-400/15 bg-[#101010] px-3 text-sm text-white outline-none focus:border-sky-400/35" />
              <FormSubmitButton className="rounded-xl border border-sky-400/25 px-5 py-3 text-sm font-semibold text-sky-100/80 transition hover:bg-sky-400/[0.08] hover:text-sky-100">
                Encerrar serviço
              </FormSubmitButton>
            </div>
          </form>
        </section>
      )}

      <section className="mt-7 rounded-3xl border border-red-400/15 bg-red-400/[0.025] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-red-300/70">Zona de perigo</p>
        <h2 className="mt-2 text-lg font-semibold">Eliminar cliente imediatamente</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
          Esta ação ignora a janela normal de recuperação. A organização, knowledge base, agente, widget, conversas, leads, acessos e imagens serão apagados. Mantemos apenas um registo histórico mínimo. Usa-a apenas após confirmação apropriada, incluindo quando um pedido de eliminação já tiver sido revisto.
        </p>
        {purgeDue && (
          <p className="mt-3 max-w-2xl rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 py-2 text-xs leading-5 text-red-100/70">
            A janela de recuperação desta organização já terminou. Esta é a ação prevista para concluir a eliminação final depois da revisão administrativa.
          </p>
        )}
        <form action={deleteClient} className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <input type="hidden" name="id" value={client.id} />
          <input name="confirmation" required placeholder={`Escreve ${client.name} para confirmar`} className="min-h-11 flex-1 rounded-xl border border-red-400/15 bg-[#101010] px-3 text-sm text-white outline-none focus:border-red-400/35" />
          <FormSubmitButton className="rounded-xl border border-red-400/25 px-5 py-3 text-sm font-semibold text-red-200/80 transition hover:bg-red-400/[0.08] hover:text-red-100">Eliminar definitivamente</FormSubmitButton>
        </form>
      </section>
    </div>
  );
}
