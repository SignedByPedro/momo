import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { legalConfig } from "@/app/legal/legal-config";
import { getServerTimeMs } from "@/lib/server-time";
import {
  executeRetentionCleanup,
  runRetentionDryRun,
  setRetentionAutomationEnabled,
  type RetentionReportRow,
} from "./actions";

type RetentionRun = {
  id: string;
  mode: "dry_run" | "cleanup";
  trigger_source: "manual" | "automatic";
  source_run_id: string | null;
  status: "completed" | "failed";
  executed_by_email: string;
  policy_version: string;
  policy_snapshot: Record<string, unknown>;
  report: RetentionReportRow[];
  eligible_total: number;
  deleted_total: number;
  error_summary: string | null;
  created_at: string;
};



type RetentionAutomation = {
  id: number;
  enabled: boolean;
  schedule_cron: string;
  schedule_timezone: string;
  policy_version: string;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_status: "never" | "disabled" | "running" | "no_data" | "completed" | "failed";
  last_run_id: string | null;
  last_error: string | null;
  updated_by_email: string | null;
  updated_at: string;
};

type TerminatedClient = {
  id: string;
  name: string;
  status: "cancelled" | "purge_due";
  terminated_at: string | null;
  recovery_until: string | null;
  termination_reason: string | null;
};

const CLEANUP_WINDOW_MINUTES = 15;

const categoryLabels: Record<RetentionReportRow["category"], string> = {
  customer_conversations: "Conversas do widget",
  customer_leads: "Leads do widget",
  resolved_support_tickets: "Tickets resolvidos",
  dormant_sales_leads: "Leads comerciais inativos",
  dormant_sales_conversations: "Conversas comerciais inativas",
  api_rate_limits: "Rate-limit técnico",
};

const categoryReasons: Record<RetentionReportRow["category"], string> = {
  customer_conversations:
    "Conversa antiga sem dependência de um lead que ainda tenha de ser conservado.",
  customer_leads:
    "Última atividade registada do lead anterior ao limite de retenção.",
  resolved_support_tickets:
    "Ticket resolvido há mais tempo do que o período de retenção definido.",
  dormant_sales_leads:
    "Lead comercial não convertido e sem atividade recente.",
  dormant_sales_conversations:
    "Conversa comercial antiga sem lead associado que ainda tenha de ser conservado.",
  api_rate_limits:
    "Contador técnico sem atualizações há mais de 48 horas.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCutoff(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function normalizeReport(value: unknown): RetentionReportRow[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const candidate = row as Partial<RetentionReportRow> & {
      eligible_count?: number | string;
      deleted_count?: number | string;
    };
    if (
      typeof candidate.organization_name !== "string" ||
      typeof candidate.category !== "string" ||
      typeof candidate.cutoff_at !== "string"
    ) {
      return [];
    }

    const eligibleCount = Number(candidate.eligible_count ?? 0);
    const deletedCount =
      candidate.deleted_count === undefined
        ? undefined
        : Number(candidate.deleted_count);
    if (!Number.isFinite(eligibleCount)) return [];
    if (deletedCount !== undefined && !Number.isFinite(deletedCount)) return [];

    return [
      {
        ...(candidate as RetentionReportRow),
        eligible_count: eligibleCount,
        deleted_count: deletedCount,
      },
    ];
  });
}

export default async function RetentionPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; notice?: string; error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const supabase = createSupabaseAdmin();

  const { data: historyData, error: historyError } = await supabase
    .from("data_retention_runs")
    .select(
      "id, mode, trigger_source, source_run_id, status, executed_by_email, policy_version, policy_snapshot, report, eligible_total, deleted_total, error_summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(60);

  if (historyError) throw historyError;

  const { data: automationData, error: automationError } = await supabase
    .from("data_retention_automation")
    .select(
      "id, enabled, schedule_cron, schedule_timezone, policy_version, last_started_at, last_completed_at, last_status, last_run_id, last_error, updated_by_email, updated_at",
    )
    .eq("id", 1)
    .maybeSingle();

  if (automationError) throw automationError;
  const automation = automationData as unknown as RetentionAutomation | null;

  const { data: terminatedData, error: terminatedError } = await supabase
    .from("organizations")
    .select("id, name, status, terminated_at, recovery_until, termination_reason")
    .in("status", ["cancelled", "purge_due"])
    .order("recovery_until", { ascending: true, nullsFirst: false });

  if (terminatedError) throw terminatedError;
  const terminatedClients = (terminatedData ?? []) as unknown as TerminatedClient[];
  const serverNow = getServerTimeMs();
  const clientRecoveryExpired = (client: TerminatedClient) =>
    Boolean(client.recovery_until && new Date(client.recovery_until).getTime() <= serverNow);
  const recoveryClients = terminatedClients.filter(
    (client) => client.status === "cancelled" && !clientRecoveryExpired(client),
  );
  const purgeDueClients = terminatedClients.filter(
    (client) => client.status === "purge_due" || clientRecoveryExpired(client),
  );

  const history = ((historyData ?? []) as unknown as RetentionRun[]).map(
    (run) => ({
      ...run,
      eligible_total: Number(run.eligible_total || 0),
      deleted_total: Number(run.deleted_total || 0),
      report: normalizeReport(run.report),
    }),
  );

  const latestDryRun = history.find(
    (run) =>
      run.mode === "dry_run" &&
      run.status === "completed" &&
      run.trigger_source === "manual",
  );
  const selected = query.run
    ? history.find((run) => run.id === query.run) ?? latestDryRun ?? history[0]
    : latestDryRun ?? history[0];
  const report = selected?.report ?? [];
  const selectedRateLimits = report.find((row) => row.category === "api_rate_limits");
  const selectedIncludesRateLimits =
    Number(selected?.policy_snapshot.rate_limit_hours) === legalConfig.rateLimitRetentionHours;

  const successfulCleanupForLatest = latestDryRun
    ? history.find(
        (run) =>
          run.mode === "cleanup" &&
          run.status === "completed" &&
          run.source_run_id === latestDryRun.id,
      )
    : undefined;

  const latestDryRunAgeMs = latestDryRun
    ? serverNow - new Date(latestDryRun.created_at).getTime()
    : Number.POSITIVE_INFINITY;
  const cleanupExpired =
    !Number.isFinite(latestDryRunAgeMs) ||
    latestDryRunAgeMs > CLEANUP_WINDOW_MINUTES * 60 * 1000;
  const canCleanup = Boolean(
    latestDryRun &&
      latestDryRun.eligible_total > 0 &&
      !cleanupExpired &&
      !successfulCleanupForLatest,
  );
  const cleanupPhrase = latestDryRun
    ? `ELIMINAR ${latestDryRun.eligible_total}`
    : "";

  const selectedIsCleanup = selected?.mode === "cleanup";
  const selectedCount = selectedIsCleanup
    ? selected?.deleted_total ?? 0
    : selected?.eligible_total ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">
            Privacidade & dados
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Retenção de dados
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
            Analisa os dados que ultrapassaram os prazos definidos, permite uma
            limpeza manual auditada e gere a execução automática diária das
            categorias suportadas.
          </p>
        </div>

        <form action={runRetentionDryRun}>
          <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
            Executar análise dry-run
          </FormSubmitButton>
        </form>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-sm leading-6 text-amber-100/75">
        <strong className="font-semibold text-amber-100">Proteção ativa.</strong>{" "}
        O dry-run manual nunca apaga dados. A limpeza manual só aceita o dry-run
        manual mais recente, expira após {CLEANUP_WINDOW_MINUTES} minutos, exige
        confirmação escrita e volta a validar as contagens. A automação cria o
        seu próprio dry-run imediatamente antes de limpar e reutiliza a mesma
        validação transacional.
      </div>

      {query.notice && (
        <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">
          {query.notice}
        </div>
      )}
      {query.error && (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">
          {query.error}
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Retenção automática</h2>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${
                  automation?.enabled
                    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200/80"
                    : "border-white/[0.08] bg-white/[0.03] text-white/35"
                }`}
              >
                {automation?.enabled ? "ativa" : "desativada"}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/35">
              O Supabase Cron verifica as categorias suportadas todos os dias às
              03:15 UTC. Enquanto estiver desativada, o job continua instalado mas
              termina sem eliminar dados.
            </p>
            {automation && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-white/30">
                <span>Agenda: {automation.schedule_cron} · {automation.schedule_timezone}</span>
                <span>Último estado: {automation.last_status}</span>
                {automation.last_completed_at && (
                  <span>Última conclusão: {formatDate(automation.last_completed_at)}</span>
                )}
                {automation.updated_by_email && (
                  <span>Alterado por: {automation.updated_by_email}</span>
                )}
              </div>
            )}
            {automation?.last_error && (
              <p className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 py-2 text-xs text-red-200/75">
                Último erro: {automation.last_error}
              </p>
            )}
          </div>

          {automation && (
            <form action={setRetentionAutomationEnabled}>
              <input
                type="hidden"
                name="enabled"
                value={automation.enabled ? "false" : "true"}
              />
              <FormSubmitButton
                className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  automation.enabled
                    ? "border-white/[0.09] bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                    : "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.13]"
                }`}
              >
                {automation.enabled ? "Desativar automação" : "Ativar automação"}
              </FormSubmitButton>
            </form>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-sky-400/15 bg-sky-400/[0.025] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200/70">Encerramento de clientes</p>
            <h2 className="mt-2 text-sm font-semibold">Janela de recuperação de {legalConfig.cancellationRecoveryDays} dias</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/35">
              Um cancelamento normal suspende o portal para uso operacional e torna o widget público indisponível, mas conserva a conta durante a janela de recuperação. Às 03:35 UTC o cron marca automaticamente como “Eliminação pendente” as janelas expiradas. A eliminação final continua a exigir confirmação administrativa e não é feita por este cron.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-3 py-1.5 text-sky-100/75">{recoveryClients.length} em recuperação</span>
            <span className="rounded-full border border-red-400/20 bg-red-400/[0.06] px-3 py-1.5 text-red-100/75">{purgeDueClients.length} pendentes</span>
          </div>
        </div>

        {terminatedClients.length === 0 ? (
          <p className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 text-sm text-white/35">
            Não existem clientes em recuperação nem pendentes de eliminação final.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-white/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Encerrado</th>
                  <th className="px-4 py-3 font-medium">Recuperação até</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {terminatedClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white/80">{client.name}</p>
                      {client.termination_reason && <p className="mt-1 max-w-[320px] truncate text-xs text-white/25">{client.termination_reason}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${(client.status === "purge_due" || clientRecoveryExpired(client)) ? "border-red-400/20 bg-red-400/[0.06] text-red-100/75" : "border-sky-400/20 bg-sky-400/[0.06] text-sky-100/75"}`}>
                        {(client.status === "purge_due" || clientRecoveryExpired(client)) ? "Eliminação pendente" : "Em recuperação"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{client.terminated_at ? formatDate(client.terminated_at) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/40">{client.recovery_until ? formatDate(client.recovery_until) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/clients/${client.id}`} className="text-xs text-[#ff9a4d] hover:text-[#ffb175]">Abrir cliente →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <p className="text-xs text-white/35">Conversas do widget</p>
          <p className="mt-2 text-2xl font-semibold">
            {legalConfig.customerConversationRetentionMonths} meses
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <p className="text-xs text-white/35">Leads do widget</p>
          <p className="mt-2 text-2xl font-semibold">
            {legalConfig.customerLeadRetentionMonths} meses
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <p className="text-xs text-white/35">Tickets resolvidos</p>
          <p className="mt-2 text-2xl font-semibold">
            {legalConfig.resolvedSupportRetentionMonths} meses
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <p className="text-xs text-white/35">Prospeção Momo inativa</p>
          <p className="mt-2 text-2xl font-semibold">
            {legalConfig.dormantSalesLeadRetentionMonths} meses
          </p>
        </div>
        <div className="rounded-2xl border border-[#ff7a18]/15 bg-[#151515] p-5">
          <p className="text-xs text-white/35">Rate-limit técnico</p>
          <p className="mt-2 text-2xl font-semibold">{legalConfig.rateLimitRetentionHours} horas</p>
          <p className="mt-2 text-xs text-white/30">Desde a última atualização</p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">
              {selectedIsCleanup ? "Execução de limpeza" : "Análise selecionada"}
            </h2>
            <p className="mt-1 text-xs text-white/30">
              {selected
                ? `${formatDate(selected.created_at)} · ${selected.trigger_source === "automatic" ? "automático" : "manual"} · ${selected.executed_by_email}`
                : "Ainda não foi executada nenhuma análise."}
            </p>
          </div>
          {selected && (
            <div
              className={`rounded-full border px-3 py-1.5 text-xs ${
                selectedIsCleanup
                  ? selected.status === "completed"
                    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200/80"
                    : "border-red-400/20 bg-red-400/[0.06] text-red-200/80"
                  : "border-[#ff7a18]/20 bg-[#ff7a18]/[0.06] text-[#ff9b50]"
              }`}
            >
              {selectedIsCleanup
                ? selected.status === "completed"
                  ? `${selectedCount} eliminados`
                  : "limpeza falhada"
                : `${selectedCount} elegíveis`}
            </div>
          )}
        </div>

        {selected && selectedIncludesRateLimits && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-[#ff7a18]/[0.035] px-5 py-3 text-xs">
            <span className="font-medium text-white/75">Rate-limit técnico · {legalConfig.rateLimitRetentionHours} horas</span>
            <span className="font-semibold text-[#ff9b50]">
              {selected?.mode === "cleanup" && selected.status === "failed"
                ? 0
                : selected?.mode === "cleanup"
                  ? selectedRateLimits?.deleted_count ?? 0
                  : selectedRateLimits?.eligible_count ?? 0} {selected?.mode === "cleanup" ? "eliminados" : "elegíveis"}
            </span>
          </div>
        )}

        {!selected ? (
          <div className="px-5 py-14 text-center text-sm text-white/35">
            Executa o primeiro dry-run para obter uma fotografia do estado atual.
          </div>
        ) : report.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-emerald-200/80">
              {selectedIsCleanup
                ? "A execução não contém registos eliminados."
                : "Nenhum registo ultrapassa os prazos analisados."}
            </p>
            <p className="mt-2 text-xs text-white/30">
              {selectedIsCleanup
                ? "Consulta o histórico e os logs se esta execução estiver marcada como falhada."
                : "Nenhum dado foi alterado."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-white/30">
                <tr>
                  <th className="px-5 py-3 font-medium">Âmbito</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">
                    {selectedIsCleanup ? "Eliminados" : "Elegíveis"}
                  </th>
                  <th className="px-5 py-3 font-medium">Data-limite</th>
                  <th className="px-5 py-3 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {report.map((row, index) => (
                  <tr
                    key={`${row.organization_id ?? "momo"}-${row.category}-${index}`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-white/85">
                        {row.organization_name}
                      </p>
                      <p className="mt-1 text-[11px] text-white/25">
                        {row.scope_type === "organization"
                          ? "Dados de cliente"
                          : row.category === "api_rate_limits"
                            ? "Dados técnicos do Momo"
                            : "Dados comerciais do Momo"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-white/65">
                      {categoryLabels[row.category] ?? row.category}
                    </td>
                    <td
                      className={`px-5 py-4 font-semibold ${
                        selectedIsCleanup ? "text-emerald-300" : "text-[#ff9b50]"
                      }`}
                    >
                      {selectedIsCleanup
                        ? row.deleted_count ?? row.eligible_count
                        : row.eligible_count}
                    </td>
                    <td className="px-5 py-4 text-xs text-white/45">
                      anteriores a {row.category === "api_rate_limits" ? formatDate(row.cutoff_at) : formatCutoff(row.cutoff_at)}
                    </td>
                    <td className="max-w-[360px] px-5 py-4 text-xs leading-5 text-white/40">
                      {categoryReasons[row.category] ?? row.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-5">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.16em] text-red-300/70">
            Zona destrutiva
          </p>
          <h2 className="mt-2 text-lg font-semibold">Limpeza manual</h2>
          {!latestDryRun ? (
            <p className="mt-2 text-sm leading-6 text-white/40">
              Executa primeiro um dry-run. Sem uma análise recente não é possível
              iniciar qualquer eliminação.
            </p>
          ) : latestDryRun.eligible_total === 0 ? (
            <p className="mt-2 text-sm leading-6 text-white/40">
              O dry-run mais recente não encontrou dados elegíveis. Não existe
              nada para limpar.
            </p>
          ) : successfulCleanupForLatest ? (
            <p className="mt-2 text-sm leading-6 text-white/40">
              Este dry-run já originou uma limpeza concluída. Para voltar a
              verificar dados, executa uma nova análise.
            </p>
          ) : cleanupExpired ? (
            <p className="mt-2 text-sm leading-6 text-white/40">
              O dry-run mais recente expirou. Por segurança, uma análise só pode
              ser usada durante {CLEANUP_WINDOW_MINUTES} minutos. Executa um novo
              dry-run antes de limpar.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-white/45">
                O dry-run mais recente encontrou{" "}
                <strong className="text-white/80">
                  {latestDryRun.eligible_total} registo
                  {latestDryRun.eligible_total === 1 ? "" : "s"}
                </strong>{" "}
                elegível{latestDryRun.eligible_total === 1 ? "" : "eis"}. A
                limpeza volta a validar o estado da base de dados e corre numa
                única transação. Se algo não coincidir, tudo é revertido.
              </p>
              <form action={executeRetentionCleanup} className="mt-5 max-w-xl">
                <input type="hidden" name="run_id" value={latestDryRun.id} />
                <label className="block text-xs text-white/45">
                  Para confirmar, escreve exatamente{" "}
                  <span className="font-mono font-semibold text-red-200">
                    {cleanupPhrase}
                  </span>
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    name="confirmation"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-red-300/35"
                    placeholder={cleanupPhrase}
                    required
                  />
                  <FormSubmitButton
                    disabled={!canCleanup}
                    className="rounded-xl border border-red-400/25 bg-red-400/[0.09] px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-400/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Executar limpeza
                  </FormSubmitButton>
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <h2 className="text-sm font-semibold">Histórico de retenção</h2>
          <p className="mt-1 text-xs leading-5 text-white/30">
            O histórico guarda apenas resultados agregados e metadados de
            auditoria, nunca uma cópia das mensagens ou contactos eliminados.
          </p>

          <div className="mt-4 divide-y divide-white/[0.05]">
            {history.length === 0 ? (
              <p className="py-4 text-sm text-white/35">Sem histórico.</p>
            ) : (
              history.map((run) => (
                <Link
                  key={run.id}
                  href={`/admin/retention?run=${encodeURIComponent(run.id)}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm transition hover:text-[#ff9b50]"
                >
                  <span>
                    <span className="flex items-center gap-2 text-white/70">
                      {formatDate(run.created_at)}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${
                          run.mode === "cleanup"
                            ? run.status === "completed"
                              ? "bg-emerald-400/[0.08] text-emerald-200/70"
                              : "bg-red-400/[0.08] text-red-200/70"
                            : "bg-[#ff7a18]/[0.08] text-[#ff9b50]/80"
                        }`}
                      >
                        {run.mode === "cleanup"
                          ? run.status === "completed"
                            ? "limpeza"
                            : "falhou"
                          : "dry-run"}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] text-white/30">
                      {run.trigger_source === "automatic" ? "Automático" : "Manual"} · {run.executed_by_email} · política v{run.policy_version}
                    </span>
                  </span>
                  <span className="text-xs text-white/45">
                    {run.mode === "cleanup"
                      ? `${run.deleted_total} eliminados`
                      : `${run.eligible_total} elegíveis`}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
          <h2 className="text-sm font-semibold">Ainda fora da eliminação automática final</h2>
          <div className="mt-4 space-y-4 text-xs leading-5 text-white/40">
            <div>
              <p className="font-medium text-white/65">
                Eliminação final de contas encerradas · após {legalConfig.cancellationRecoveryDays} dias
              </p>
              <p className="mt-1">
                O relógio de recuperação e a passagem automática para “Eliminação pendente” já estão implementados. A destruição final da organização e dos utilizadores Auth continua deliberadamente sujeita a confirmação administrativa.
              </p>
            </div>
            <div>
              <p className="font-medium text-white/65">
                Eventos de segurança · retenção futura a definir
              </p>
              <p className="mt-1">
                Os contadores técnicos de rate limiting são agora tratados na
                retenção de 48 horas. Um eventual histórico separado de incidentes
                de segurança ainda não foi implementado nem é eliminado por este motor.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
