"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrganizationMemberUsage } from "@/lib/admin/members";
import { getOrganization } from "@/lib/admin/organizations";
import { inviteOrganizationUser, organizationEmailAlreadyUsed } from "@/lib/members/invitations";
import { LastActiveOwnerError, restoreMembership, revokeMembershipGuarded, type RemovedMembership } from "@/lib/members/revocation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalRole } from "@/lib/portal/auth";

const allowedRoles = new Set<PortalRole>(["client_owner", "client_member"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null, max = 320) {
  return String(value ?? "").trim().slice(0, max);
}

function accessPath(organizationId: string) {
  return `/admin/clients/${organizationId}/access`;
}

function redirectWith(organizationId: string, key: "notice" | "error", message: string): never {
  redirect(`${accessPath(organizationId)}?${key}=${encodeURIComponent(message)}`);
}

async function appOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function inviteOrganizationMember(formData: FormData) {
  const adminSession = await requireAdmin();
  const organizationId = clean(formData.get("organizationId"), 100);
  const email = clean(formData.get("email")).toLowerCase();
  const role = clean(formData.get("role"), 40) as PortalRole;

  if (!organizationId) return;
  if (!emailPattern.test(email)) redirectWith(organizationId, "error", "Introduz um endereço de email válido.");
  if (!allowedRoles.has(role)) redirectWith(organizationId, "error", "A permissão selecionada não é válida.");

  const organization = await getOrganization(organizationId);
  if (!organization) redirectWith(organizationId, "error", "Cliente não encontrado.");

  const usage = await getOrganizationMemberUsage(organizationId);
  if (usage.full) {
    redirectWith(
      organizationId,
      "error",
      `Esta organização já utiliza ${usage.used}/${usage.limit} acessos. Aumenta o limite antes de convidar outra pessoa.`,
    );
  }

  if (await organizationEmailAlreadyUsed(email)) {
    redirectWith(organizationId, "error", "Esse email já tem acesso a uma organização.");
  }

  try {
    await inviteOrganizationUser({
      organizationId,
      organizationName: organization.name,
      email,
      role,
      invitedBy: adminSession.userId,
      origin: await appOrigin(),
      language: organization.primary_language === "en" ? "en" : "pt",
    });
  } catch (reason) {
    const raw = reason instanceof Error ? reason.message : "Não foi possível enviar o convite.";
    const message = raw.toLowerCase().includes("already")
      ? "Esse email já possui uma conta. Remove o acesso antigo antes de voltar a convidar."
      : raw;
    redirectWith(organizationId, "error", message);
  }

  revalidatePath(accessPath(organizationId));
  revalidatePath(`/admin/clients/${organizationId}`);
  redirectWith(
    organizationId,
    "notice",
    `Convite enviado para ${email}. O acesso só fica ativo depois de confirmar esse email.`,
  );
}

export async function resendOrganizationInvite(formData: FormData) {
  const adminSession = await requireAdmin();
  const organizationId = clean(formData.get("organizationId"), 100);
  const userId = clean(formData.get("userId"), 100);
  if (!organizationId || !userId) return;

  const organization = await getOrganization(organizationId);
  if (!organization) redirectWith(organizationId, "error", "Cliente não encontrado.");

  const supabase = createSupabaseAdmin();
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("email, role, accepted_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!member) redirectWith(organizationId, "error", "Convite não encontrado.");
  if (member.accepted_at) redirectWith(organizationId, "error", "Este utilizador já confirmou a conta.");

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;

  try {
    await inviteOrganizationUser({
      organizationId,
      organizationName: organization.name,
      email: member.email,
      role: member.role as PortalRole,
      invitedBy: adminSession.userId,
      origin: await appOrigin(),
      language: organization.primary_language === "en" ? "en" : "pt",
    });
  } catch (reason) {
    redirectWith(organizationId, "error", reason instanceof Error ? reason.message : "Não foi possível reenviar o convite.");
  }

  revalidatePath(accessPath(organizationId));
  redirectWith(organizationId, "notice", `Novo convite enviado para ${member.email}.`);
}

export async function revokeOrganizationMember(formData: FormData) {
  await requireAdmin();
  const organizationId = clean(formData.get("organizationId"), 100);
  const userId = clean(formData.get("userId"), 100);
  if (!organizationId || !userId) return;

  const supabase = createSupabaseAdmin();
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!member) redirectWith(organizationId, "error", "Acesso não encontrado.");

  if (member.role === "client_owner") {
    // The SQL guard serializes Owner removals with personal account deletions.
    let removed: RemovedMembership;
    try {
      removed = await revokeMembershipGuarded(organizationId, userId);
    } catch (reason) {
      if (reason instanceof LastActiveOwnerError) {
        redirectWith(organizationId, "error", "Não podes remover o último Owner ativo. Adiciona e confirma outro Owner primeiro.");
      }
      throw reason;
    }

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      try {
        await restoreMembership(removed);
      } catch (restoreError) {
        console.error("[admin-access] URGENT: Owner membership restoration failed:", { organizationId, userId, restoreError });
        redirectWith(organizationId, "error", "O acesso foi bloqueado, mas a conta de autenticação não foi apagada. Contacta o suporte técnico.");
      }
      redirectWith(organizationId, "error", "Não foi possível apagar a conta Auth; o acesso foi restaurado. Verifica objetos Storage associados.");
    }
  } else {
    // Members may be disconnected even when Auth deletion needs manual repair.
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      const { error: deleteMembershipError } = await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .eq("role", "client_member");
      if (deleteMembershipError) throw deleteMembershipError;
      console.error("[admin-access] Member access revoked, Auth deletion needs manual repair:", { organizationId, userId, deleteUserError });
    }
  }

  revalidatePath(accessPath(organizationId));
  revalidatePath(`/admin/clients/${organizationId}`);
  redirectWith(organizationId, "notice", "Acesso removido.");
}
