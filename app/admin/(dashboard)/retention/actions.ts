"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { legalConfig } from "@/app/legal/legal-config";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type RetentionReportRow = {
  scope_type: "organization" | "momo";
  organization_id: string | null;
  organization_name: string;
  category:
    | "customer_conversations"
    | "customer_leads"
    | "resolved_support_tickets"
    | "dormant_sales_leads"
    | "dormant_sales_conversations"
    | "api_rate_limits";
  eligible_count: number;
  deleted_count?: number;
  cutoff_at: string;
  reason: string;
};

type RetentionRunRecord = {
  id: string;
  mode: "dry_run" | "cleanup";
  trigger_source: "manual" | "automatic";
  source_run_id: string | null;
  status: "completed" | "failed";
  executed_by_user_id: string | null;
  executed_by_email: string;
  policy_version: string;
  policy_snapshot: Record<string, unknown>;
  report: RetentionReportRow[];
  eligible_total: number;
  deleted_total: number;
  created_at: string;
};

const CLEANUP_WINDOW_MS = 15 * 60 * 1000;

function clean(value: FormDataEntryValue | null, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function subtractMonths(value: Date, months: number) {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

export async function runRetentionDryRun() {
  const admin = await requireAdmin();
  const supabase = createSupabaseAdmin();
  const now = new Date();

  const customerConversationCutoff = subtractMonths(
    now,
    legalConfig.customerConversationRetentionMonths,
  ).toISOString();
  const customerLeadCutoff = subtractMonths(
    now,
    legalConfig.customerLeadRetentionMonths,
  ).toISOString();
  const supportCutoff = subtractMonths(
    now,
    legalConfig.resolvedSupportRetentionMonths,
  ).toISOString();
  const salesCutoff = subtractMonths(
    now,
    legalConfig.dormantSalesLeadRetentionMonths,
  ).toISOString();

  const rateLimitCutoff = new Date(
    now.getTime() - legalConfig.rateLimitRetentionHours * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase.rpc("retention_dry_run_report", {
    p_customer_conversation_cutoff: customerConversationCutoff,
    p_customer_lead_cutoff: customerLeadCutoff,
    p_support_cutoff: supportCutoff,
    p_sales_cutoff: salesCutoff,
    p_rate_limit_cutoff: rateLimitCutoff,
  });

  if (error) {
    console.error("[retention] Dry-run report failed:", error);
    redirect(
      `/admin/retention?error=${encodeURIComponent(
        "Não foi possível executar a análise. Confirma que as migrations de retenção foram aplicadas no Supabase.",
      )}`,
    );
  }

  const report = ((data ?? []) as unknown as RetentionReportRow[]).map((row) => ({
    ...row,
    eligible_count: Number(row.eligible_count || 0),
  }));
  const eligibleTotal = report.reduce(
    (total, row) => total + Number(row.eligible_count || 0),
    0,
  );

  const policySnapshot = {
    generated_at: now.toISOString(),
    customer_conversations_months:
      legalConfig.customerConversationRetentionMonths,
    customer_leads_months: legalConfig.customerLeadRetentionMonths,
    resolved_support_months: legalConfig.resolvedSupportRetentionMonths,
    dormant_sales_months: legalConfig.dormantSalesLeadRetentionMonths,
    post_termination_recovery_days: legalConfig.cancellationRecoveryDays,
    rate_limit_hours: legalConfig.rateLimitRetentionHours,
    cutoffs: {
      customer_conversation_cutoff: customerConversationCutoff,
      customer_lead_cutoff: customerLeadCutoff,
      support_cutoff: supportCutoff,
      sales_cutoff: salesCutoff,
      rate_limit_cutoff: rateLimitCutoff,
    },
    exclusions: ["post_termination_final_purge"],
  };

  const { data: run, error: insertError } = await supabase
    .from("data_retention_runs")
    .insert({
      mode: "dry_run",
      trigger_source: "manual",
      status: "completed",
      executed_by_user_id: admin.userId,
      executed_by_email: admin.email,
      policy_version: legalConfig.version,
      policy_snapshot: policySnapshot,
      report,
      eligible_total: eligibleTotal,
      deleted_total: 0,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[retention] Could not save dry-run audit:", insertError);
    redirect(
      `/admin/retention?error=${encodeURIComponent(
        "A análise foi executada, mas não foi possível guardar o registo de auditoria.",
      )}`,
    );
  }

  revalidatePath("/admin/retention");
  redirect(
    `/admin/retention?run=${encodeURIComponent(run.id)}&notice=${encodeURIComponent(
      `Análise concluída. ${eligibleTotal} registo${eligibleTotal === 1 ? "" : "s"} elegível${eligibleTotal === 1 ? "" : "eis"}. Nenhum dado foi eliminado.`,
    )}`,
  );
}

export async function executeRetentionCleanup(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseAdmin();
  const runId = clean(formData.get("run_id"), 80);
  const confirmation = clean(formData.get("confirmation"), 80);

  if (!runId) {
    redirect(`/admin/retention?error=${encodeURIComponent("Dry-run inválido.")}`);
  }

  const { data: sourceData, error: sourceError } = await supabase
    .from("data_retention_runs")
    .select(
      "id, mode, trigger_source, source_run_id, status, executed_by_user_id, executed_by_email, policy_version, policy_snapshot, report, eligible_total, deleted_total, created_at",
    )
    .eq("id", runId)
    .maybeSingle();

  if (sourceError) throw sourceError;
  const source = sourceData as unknown as RetentionRunRecord | null;
  if (
    !source ||
    source.mode !== "dry_run" ||
    source.status !== "completed" ||
    source.trigger_source !== "manual"
  ) {
    redirect(`/admin/retention?error=${encodeURIComponent("O dry-run selecionado já não é válido.")}`);
  }

  const expectedConfirmation = `ELIMINAR ${Number(source.eligible_total || 0)}`;
  if (confirmation !== expectedConfirmation) {
    redirect(
      `/admin/retention?run=${encodeURIComponent(runId)}&error=${encodeURIComponent(
        `Confirmação incorreta. Escreve exatamente: ${expectedConfirmation}`,
      )}`,
    );
  }

  if (Number(source.eligible_total || 0) <= 0) {
    redirect(
      `/admin/retention?run=${encodeURIComponent(runId)}&error=${encodeURIComponent(
        "Este dry-run não tem dados elegíveis para eliminar.",
      )}`,
    );
  }

  const ageMs = Date.now() - new Date(source.created_at).getTime();
  if (!Number.isFinite(ageMs) || ageMs > CLEANUP_WINDOW_MS) {
    redirect(
      `/admin/retention?run=${encodeURIComponent(runId)}&error=${encodeURIComponent(
        "Este dry-run expirou. Executa uma nova análise antes de limpar dados.",
      )}`,
    );
  }

  const { data: latestDryRunData, error: latestDryRunError } = await supabase
    .from("data_retention_runs")
    .select("id")
    .eq("mode", "dry_run")
    .eq("trigger_source", "manual")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestDryRunError) throw latestDryRunError;

  if (!latestDryRunData || latestDryRunData.id !== runId) {
    redirect(
      `/admin/retention?run=${encodeURIComponent(runId)}&error=${encodeURIComponent(
        "Só o dry-run mais recente pode ser usado para uma limpeza. Executa uma nova análise.",
      )}`,
    );
  }

  const { data: existingCleanup, error: cleanupLookupError } = await supabase
    .from("data_retention_runs")
    .select("id")
    .eq("mode", "cleanup")
    .eq("status", "completed")
    .eq("source_run_id", runId)
    .limit(1)
    .maybeSingle();
  if (cleanupLookupError) throw cleanupLookupError;

  if (existingCleanup) {
    redirect(
      `/admin/retention?run=${encodeURIComponent(existingCleanup.id)}&error=${encodeURIComponent(
        "Este dry-run já foi usado numa limpeza concluída.",
      )}`,
    );
  }

  const { data, error } = await supabase.rpc("retention_execute_cleanup", {
    p_source_run_id: runId,
    p_executed_by_user_id: admin.userId,
    p_executed_by_email: admin.email,
  });

  if (error) {
    console.error("[retention] Controlled cleanup failed:", error);

    // Record the failed attempt without copying message/contact content. If the
    // migration itself is missing, this audit insert may fail too; the original
    // error is still preserved in Vercel logs.
    await supabase.from("data_retention_runs").insert({
      mode: "cleanup",
      trigger_source: "manual",
      source_run_id: runId,
      status: "failed",
      executed_by_user_id: admin.userId,
      executed_by_email: admin.email,
      policy_version: source.policy_version,
      policy_snapshot: source.policy_snapshot,
      report: source.report,
      eligible_total: Number(source.eligible_total || 0),
      deleted_total: 0,
      error_summary: "controlled_cleanup_failed",
    });

    const staleLike = [
      "RETENTION_SOURCE_STALE",
      "RETENTION_SOURCE_NOT_LATEST",
      "RETENTION_SOURCE_CHANGED",
      "RETENTION_DELETE_COUNT_MISMATCH",
      "RETENTION_DELETE_TOTAL_MISMATCH",
    ].some((code) => error.message?.includes(code));

    redirect(
      `/admin/retention?run=${encodeURIComponent(runId)}&error=${encodeURIComponent(
        staleLike
          ? "A limpeza foi cancelada porque o estado dos dados já não corresponde ao dry-run. Nenhum dado foi eliminado. Executa uma nova análise."
          : "A limpeza foi cancelada e a transação foi revertida. Nenhum dado foi eliminado. Consulta os logs antes de tentar novamente.",
      )}`,
    );
  }

  const result = Array.isArray(data)
    ? ((data[0] ?? null) as unknown as {
        cleanup_run_id?: string;
        deleted_total?: number | string;
      } | null)
    : null;

  if (!result?.cleanup_run_id) {
    redirect(
      `/admin/retention?run=${encodeURIComponent(runId)}&error=${encodeURIComponent(
        "A limpeza terminou sem devolver um registo de auditoria válido. Confirma o estado no Supabase antes de repetir.",
      )}`,
    );
  }

  const deletedTotal = Number(result.deleted_total || 0);
  revalidatePath("/admin/retention");
  redirect(
    `/admin/retention?run=${encodeURIComponent(result.cleanup_run_id)}&notice=${encodeURIComponent(
      `Limpeza concluída. ${deletedTotal} registo${deletedTotal === 1 ? "" : "s"} eliminado${deletedTotal === 1 ? "" : "s"}. A execução ficou registada no audit.`,
    )}`,
  );
}


export async function setRetentionAutomationEnabled(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseAdmin();
  const enabled = clean(formData.get("enabled"), 10) === "true";

  const { error } = await supabase
    .from("data_retention_automation")
    .update({
      enabled,
      updated_by_user_id: admin.userId,
      updated_by_email: admin.email,
      updated_at: new Date().toISOString(),
      ...(enabled
        ? {}
        : {
            last_status: "disabled",
            last_error: null,
          }),
    })
    .eq("id", 1);

  if (error) {
    console.error("[retention] Could not update automation status:", error);
    redirect(
      `/admin/retention?error=${encodeURIComponent(
        "Não foi possível alterar a automação. Confirma que a migration v2.11 foi aplicada no Supabase.",
      )}`,
    );
  }

  revalidatePath("/admin/retention");
  redirect(
    `/admin/retention?notice=${encodeURIComponent(
      enabled
        ? "Retenção automática ativada. O ciclo agendado corre diariamente às 03:15 UTC."
        : "Retenção automática desativada. O cron continua instalado, mas não elimina dados enquanto esta opção estiver desligada.",
    )}`,
  );
}
