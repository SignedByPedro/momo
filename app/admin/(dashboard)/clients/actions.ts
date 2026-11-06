"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { legalConfig } from "@/app/legal/legal-config";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { OrganizationLanguage, OrganizationStatus } from "@/lib/admin/organizations";
import { syncDefaultAgentPlaceholder, syncSingleLanguageAgentLanguage } from "@/lib/admin/agents";
import { isOrganizationPlan, organizationPlanLabel, type OrganizationPlan } from "@/lib/plans";

const normalStatuses = new Set<OrganizationStatus>(["setup", "active", "paused"]);
const allStatuses = new Set<OrganizationStatus>([
  "setup",
  "active",
  "paused",
  "cancelled",
  "purge_due",
]);
const allowedLanguages = new Set<OrganizationLanguage>(["pt", "en"]);

function clean(value: FormDataEntryValue | null, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "cliente";
}

function normalizeWebsite(value: string) {
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function clientPath(id: string) {
  return `/admin/clients/${id}`;
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select("slug")
    .eq("slug", base)
    .maybeSingle();

  if (error) throw error;
  if (!data) return base;
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function createClient(formData: FormData) {
  await requireAdmin();

  const name = clean(formData.get("name"), 160);
  const websiteInput = clean(formData.get("website"), 500);
  const businessType = clean(formData.get("businessType"), 120) || null;
  const country = clean(formData.get("country"), 120) || null;
  const language = clean(formData.get("primaryLanguage"), 10) as OrganizationLanguage;
  const plan = clean(formData.get("plan"), 20) as OrganizationPlan;

  if (!name) throw new Error("O nome da empresa é obrigatório.");
  if (!allowedLanguages.has(language)) throw new Error("Idioma inválido.");
  if (!isOrganizationPlan(plan)) throw new Error("Plano inválido.");

  const website = normalizeWebsite(websiteInput);
  if (websiteInput && !website) throw new Error("O website não é válido.");

  const supabase = createSupabaseAdmin();
  const slug = await uniqueSlug(name);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      website,
      business_type: businessType,
      country,
      primary_language: language,
      plan,
      status: "setup",
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) throw error;

  await syncDefaultAgentPlaceholder(data.id, language);

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${data.id}`);
}

export async function updateClient(formData: FormData) {
  await requireAdmin();

  const id = clean(formData.get("id"), 80);
  const name = clean(formData.get("name"), 160);
  const websiteInput = clean(formData.get("website"), 500);
  const businessType = clean(formData.get("businessType"), 120) || null;
  const country = clean(formData.get("country"), 120) || null;
  const language = clean(formData.get("primaryLanguage"), 10) as OrganizationLanguage;
  const status = clean(formData.get("status"), 20) as OrganizationStatus;
  const plan = clean(formData.get("plan"), 20) as OrganizationPlan;
  const memberLimit = Number.parseInt(clean(formData.get("memberLimit"), 4), 10);

  if (!id || !name) throw new Error("Dados do cliente incompletos.");
  if (!allowedLanguages.has(language)) throw new Error("Idioma inválido.");
  if (!isOrganizationPlan(plan)) throw new Error("Plano inválido.");
  if (!allStatuses.has(status)) throw new Error("Estado inválido.");
  if (!Number.isInteger(memberLimit) || memberLimit < 1 || memberLimit > 1000) throw new Error("O limite de utilizadores deve estar entre 1 e 1000.");

  const website = normalizeWebsite(websiteInput);
  if (websiteInput && !website) throw new Error("O website não é válido.");

  const supabase = createSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("organizations")
    .select("status, plan")
    .eq("id", id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) redirect("/admin/clients?error=" + encodeURIComponent("Cliente não encontrado."));

  const currentStatus = existing.status as OrganizationStatus;
  const terminationState = currentStatus === "cancelled" || currentStatus === "purge_due";
  if (terminationState && status !== currentStatus) {
    redirect(`${clientPath(id)}?error=${encodeURIComponent("Usa os controlos de encerramento para reativar ou eliminar este cliente.")}`);
  }
  if (!terminationState && !normalStatuses.has(status)) {
    redirect(`${clientPath(id)}?error=${encodeURIComponent("Usa o fluxo de encerramento para colocar um cliente em recuperação.")}`);
  }

  const { count: currentMembers, error: countError } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", id);
  if (countError) throw countError;
  if ((currentMembers ?? 0) > memberLimit) {
    throw new Error(`Não podes reduzir o limite para ${memberLimit} porque existem ${currentMembers ?? 0} utilizadores/convites nesta organização.`);
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      website,
      business_type: businessType,
      country,
      primary_language: language,
      plan,
      status,
      member_limit: memberLimit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  // Admin is the only surface that can change the primary language. Keep
  // single-language agents in sync without replacing multilingual configurations.
  await Promise.all([
    syncDefaultAgentPlaceholder(id, language),
    syncSingleLanguageAgentLanguage(id, language),
  ]);

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath(`/admin/clients/${id}/agent`);
  revalidatePath(`/admin/clients/${id}/widget`);
  revalidatePath("/portal", "layout");

  const previousPlan = isOrganizationPlan(String(existing.plan ?? ""))
    ? (existing.plan as OrganizationPlan)
    : "premium";
  const planChanged = previousPlan !== plan;
  const notice = planChanged
    ? plan === "base"
      ? `Plano alterado para ${organizationPlanLabel(plan)}. As funcionalidades Premium ficam bloqueadas no portal, mas os dados/configurações existentes são preservados para um futuro upgrade.`
      : `Plano alterado para ${organizationPlanLabel(plan)}. O novo acesso fica disponível no portal imediatamente.`
    : "Alterações guardadas com sucesso.";

  redirect(`/admin/clients/${id}?notice=${encodeURIComponent(notice)}`);
}

export async function scheduleClientTermination(formData: FormData) {
  const admin = await requireAdmin();
  const id = clean(formData.get("id"), 80);
  const confirmation = clean(formData.get("confirmation"), 160);
  const reason = clean(formData.get("reason"), 500) || null;

  if (!id) redirect("/admin/clients?error=" + encodeURIComponent("Cliente inválido."));

  const supabase = createSupabaseAdmin();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, status")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!organization) redirect("/admin/clients?error=" + encodeURIComponent("Cliente não encontrado."));
  if (confirmation !== organization.name) {
    redirect(`${clientPath(id)}?error=${encodeURIComponent("Escreve exatamente o nome da empresa para confirmar o encerramento.")}`);
  }

  const currentStatus = organization.status as OrganizationStatus;
  if (!normalStatuses.has(currentStatus)) {
    redirect(`${clientPath(id)}?error=${encodeURIComponent("Este cliente já está num fluxo de encerramento.")}`);
  }

  const terminatedAt = new Date();
  const recoveryUntil = new Date(terminatedAt);
  recoveryUntil.setUTCDate(recoveryUntil.getUTCDate() + legalConfig.cancellationRecoveryDays);

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      status: "cancelled",
      status_before_termination: currentStatus,
      terminated_at: terminatedAt.toISOString(),
      recovery_until: recoveryUntil.toISOString(),
      termination_reason: reason,
      terminated_by_user_id: admin.userId,
      terminated_by_email: admin.email,
      updated_at: terminatedAt.toISOString(),
    })
    .eq("id", id)
    .eq("status", currentStatus);

  if (updateError) throw updateError;

  revalidatePath("/admin/clients");
  revalidatePath(clientPath(id));
  revalidatePath("/admin/retention");
  redirect(`${clientPath(id)}?notice=${encodeURIComponent(`Serviço encerrado. A organização entrou numa janela de recuperação de ${legalConfig.cancellationRecoveryDays} dias.`)}`);
}

export async function reactivateClient(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"), 80);
  if (!id) redirect("/admin/clients?error=" + encodeURIComponent("Cliente inválido."));

  const supabase = createSupabaseAdmin();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, status, recovery_until, status_before_termination")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!organization) redirect("/admin/clients?error=" + encodeURIComponent("Cliente não encontrado."));
  if (organization.status !== "cancelled") {
    redirect(`${clientPath(id)}?error=${encodeURIComponent("Este cliente já não está dentro da janela normal de recuperação.")}`);
  }

  if (!organization.recovery_until || new Date(organization.recovery_until).getTime() <= Date.now()) {
    await supabase
      .from("organizations")
      .update({ status: "purge_due", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "cancelled");
    revalidatePath(clientPath(id));
    revalidatePath("/admin/retention");
    redirect(`${clientPath(id)}?error=${encodeURIComponent("A janela de recuperação já terminou. O cliente está pendente de eliminação final.")}`);
  }

  const restoreStatus = normalStatuses.has(organization.status_before_termination as OrganizationStatus)
    ? (organization.status_before_termination as OrganizationStatus)
    : "active";
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      status: restoreStatus,
      terminated_at: null,
      recovery_until: null,
      termination_reason: null,
      status_before_termination: null,
      terminated_by_user_id: null,
      terminated_by_email: null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "cancelled");

  if (updateError) throw updateError;

  revalidatePath("/admin/clients");
  revalidatePath(clientPath(id));
  revalidatePath("/admin/retention");
  redirect(`${clientPath(id)}?notice=${encodeURIComponent("Cliente reativado. O portal e o widget voltam a seguir a configuração anterior.")}`);
}

export async function deleteClient(formData: FormData) {
  await requireAdmin();

  const id = clean(formData.get("id"), 80);
  const confirmation = clean(formData.get("confirmation"), 160);
  if (!id) return;

  const supabase = createSupabaseAdmin();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, website, business_type, country, primary_language, status, terminated_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (organizationError) throw organizationError;
  if (!organization) redirect("/admin/clients?notice=" + encodeURIComponent("Cliente já não existe."));
  if (confirmation !== organization.name) {
    redirect(`/admin/clients/${id}?error=${encodeURIComponent("Escreve exatamente o nome da empresa para confirmar a eliminação.")}`);
  }

  const [membersResult, conversationsResult, leadsResult] = await Promise.all([
    supabase.from("organization_members").select("user_id").eq("organization_id", id),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", id),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", id),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (conversationsResult.error) throw conversationsResult.error;
  if (leadsResult.error) throw leadsResult.error;

  const historicalReason = organization.status === "purge_due"
    ? "termination_recovery_expired"
    : organization.status === "cancelled"
      ? "terminated_during_recovery"
      : "deleted";

  const { error: archiveError } = await supabase.from("client_history").upsert({
    organization_id: organization.id,
    name: organization.name,
    slug: organization.slug,
    website: organization.website,
    business_type: organization.business_type,
    country: organization.country,
    primary_language: organization.primary_language,
    started_at: organization.created_at,
    ended_at: organization.terminated_at ?? new Date().toISOString(),
    member_count: membersResult.data?.length ?? 0,
    conversation_count: conversationsResult.count ?? 0,
    lead_count: leadsResult.count ?? 0,
    reason: historicalReason,
  }, { onConflict: "organization_id" });
  if (archiveError) throw archiveError;

  const { error: conversationDeleteError } = await supabase.from("conversations").delete().eq("organization_id", id);
  if (conversationDeleteError) throw conversationDeleteError;
  const { error: leadDeleteError } = await supabase.from("leads").delete().eq("organization_id", id);
  if (leadDeleteError) throw leadDeleteError;
  const { error: sourceLeadDeleteError } = await supabase.from("leads").delete().eq("converted_organization_id", id).eq("source", "momo_sales");
  if (sourceLeadDeleteError) throw sourceLeadDeleteError;

  await supabase.storage.from("widget-assets").remove([`${id}/avatar`, `${id}/launcher`]);

  for (const member of membersResult.data ?? []) {
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(member.user_id);
    if (authDeleteError) console.warn("Could not delete portal auth user", member.user_id, authDeleteError.message);
  }

  const { error: deleteError } = await supabase.from("organizations").delete().eq("id", id);
  if (deleteError) {
    await supabase.from("client_history").delete().eq("organization_id", id);
    throw deleteError;
  }

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  revalidatePath("/admin/retention");
  redirect(`/admin/clients?notice=${encodeURIComponent("Cliente eliminado. O registo histórico foi preservado, mas os dados operacionais foram apagados.")}`);
}
