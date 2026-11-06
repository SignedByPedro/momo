"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrganizationMemberUsage } from "@/lib/admin/members";
import { getOrganization } from "@/lib/admin/organizations";
import { inviteOrganizationUser, organizationEmailAlreadyUsed } from "@/lib/members/invitations";
import { requirePortalPremiumOwner } from "@/lib/portal/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null, max = 320) {
  return String(value ?? "").trim().slice(0, max);
}

function teamPath() {
  return "/portal/team";
}

function redirectWith(key: "notice" | "error", message: string): never {
  redirect(`${teamPath()}?${key}=${encodeURIComponent(message)}`);
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

export async function invitePortalMember(formData: FormData) {
  const session = await requirePortalPremiumOwner();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  const email = clean(formData.get("email")).toLowerCase();

  if (!emailPattern.test(email)) redirectWith("error", tr(l, "Introduz um endereço de email válido.", "Enter a valid email address."));
  if (email === session.email.toLowerCase()) redirectWith("error", tr(l, "Este email já pertence à tua conta.", "This email already belongs to your account."));

  const organization = await getOrganization(session.organizationId);
  if (!organization) redirectWith("error", tr(l, "Organização não encontrada.", "Organization not found."));

  const usage = await getOrganizationMemberUsage(session.organizationId);
  if (usage.full) {
    redirectWith(
      "error",
      tr(l, `A tua organização já utiliza ${usage.used}/${usage.limit} acessos. Contacta-nos se precisares de adicionar mais colaboradores.`, `Your organization is already using ${usage.used}/${usage.limit} seats. Contact us if you need more team members.`),
    );
  }

  if (await organizationEmailAlreadyUsed(email)) {
    redirectWith("error", tr(l, "Esse email já tem acesso a uma organização.", "This email already has access to an organization."));
  }

  try {
    await inviteOrganizationUser({
      organizationId: session.organizationId,
      organizationName: organization.name,
      email,
      role: "client_member",
      invitedBy: session.userId,
      origin: await appOrigin(),
      language: session.language,
    });
  } catch (reason) {
    const raw = reason instanceof Error ? reason.message : tr(l, "Não foi possível enviar o convite.", "Could not send the invite.");
    const message = raw.toLowerCase().includes("already")
      ? tr(l, "Esse email já possui uma conta. Contacta-nos se precisares de transferir esse acesso.", "This email already has an account. Contact us if you need to transfer that access.")
      : raw;
    redirectWith("error", message);
  }

  revalidatePath(teamPath());
  redirectWith("notice", tr(l, `Convite enviado para ${email}. A conta só fica ativa depois de confirmar o email.`, `Invite sent to ${email}. The account becomes active only after the email is confirmed.`));
}

export async function resendPortalMemberInvite(formData: FormData) {
  const session = await requirePortalPremiumOwner();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  const userId = clean(formData.get("userId"), 100);
  if (!userId) return;

  const organization = await getOrganization(session.organizationId);
  if (!organization) redirectWith("error", tr(l, "Organização não encontrada.", "Organization not found."));

  const supabase = createSupabaseAdmin();
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("email, role, accepted_at")
    .eq("organization_id", session.organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!member || member.role !== "client_member") redirectWith("error", tr(l, "Colaborador não encontrado.", "Team member not found."));
  if (member.accepted_at) redirectWith("error", tr(l, "Este colaborador já confirmou a conta.", "This team member has already confirmed the account."));

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;

  try {
    await inviteOrganizationUser({
      organizationId: session.organizationId,
      organizationName: organization.name,
      email: member.email,
      role: "client_member",
      invitedBy: session.userId,
      origin: await appOrigin(),
      language: session.language,
    });
  } catch (reason) {
    redirectWith("error", reason instanceof Error ? reason.message : tr(l, "Não foi possível reenviar o convite.", "Could not resend the invite."));
  }

  revalidatePath(teamPath());
  redirectWith("notice", tr(l, `Novo convite enviado para ${member.email}.`, `New invite sent to ${member.email}.`));
}

export async function removePortalMember(formData: FormData) {
  const session = await requirePortalPremiumOwner();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  const userId = clean(formData.get("userId"), 100);
  if (!userId) return;

  const supabase = createSupabaseAdmin();
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", session.organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!member || member.role !== "client_member") {
    redirectWith("error", tr(l, "Só podes remover colaboradores com permissão Member.", "You can only remove team members with the Member role."));
  }

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    const { error: deleteMembershipError } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", session.organizationId)
      .eq("user_id", userId)
      .eq("role", "client_member");
    if (deleteMembershipError) throw deleteMembershipError;
  }

  revalidatePath(teamPath());
  redirectWith("notice", tr(l, "Colaborador removido.", "Team member removed."));
}
