"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePortal } from "@/lib/portal/auth";
import { LastActiveOwnerError, restoreMembership, revokeMembershipGuarded, type RemovedMembership } from "@/lib/members/revocation";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";
import { createSupportTicket } from "@/lib/support/tickets";
import { sendNewSupportTicketNotification } from "@/lib/notifications/support-email";

function accountError(message: string): never {
  redirect(`/portal/account?error=${encodeURIComponent(message)}`);
}

const deleteRequestSubjects = [
  "Pedido de eliminação da minha conta (único Owner)",
  "Request to delete my account (sole Owner)",
];

/** Owners and Members can change only their own Portal password. */
export async function changeMyPortalPassword(formData: FormData) {
  const session = await requirePortal();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || currentPassword.length > 512) {
    accountError(tr(l, "Introduz a tua password atual.", "Enter your current password."));
  }
  if (newPassword.length < 8 || newPassword.length > 512) {
    accountError(tr(l, "A nova password deve ter pelo menos 8 caracteres.", "The new password must be at least 8 characters long."));
  }
  if (newPassword !== confirmPassword) {
    accountError(tr(l, "As novas passwords não coincidem.", "The new passwords do not match."));
  }
  if (newPassword === currentPassword) {
    accountError(tr(l, "Escolhe uma password diferente da atual.", "Choose a password different from your current password."));
  }

  // Verify the current password using a separate non-persistent client. The
  // password is never written to application storage or logs.
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data: verified, error: verificationError } = await verifier.auth.signInWithPassword({
    email: session.email,
    password: currentPassword,
  });
  if (verificationError || verified.user?.id !== session.userId) {
    accountError(tr(l, "Password atual incorreta.", "Current password is incorrect."));
  }

  const { error: temporarySignOutError } = await verifier.auth.signOut({ scope: "local" });
  if (temporarySignOutError) {
    console.error("[password-change] Could not close temporary verification session:", temporarySignOutError);
  }

  // The current password has just been verified. Use the trusted server-side
  // admin API to update exactly the authenticated user's own Auth account.
  const admin = createSupabaseAdmin();
  const { error: updateError } = await admin.auth.admin.updateUserById(session.userId, {
    password: newPassword,
  });
  if (updateError) {
    console.error("[password-change] Could not update password:", {
      userId: session.userId,
      organizationId: session.organizationId,
      error: updateError.message,
    });
    accountError(tr(l, "Não foi possível alterar a password. Tenta novamente.", "Could not change the password. Please try again."));
  }

  revalidatePath("/portal/account");
  redirect(`/portal/account?notice=${encodeURIComponent(tr(l, "Password alterada com sucesso.", "Password changed successfully."))}`);
}

/** Personal account deletion. The company and its operational data are untouched. */
export async function deleteMyPortalAccount(formData: FormData) {
  const session = await requirePortal();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  const expectedConfirmation = l === "en" ? "DELETE" : "ELIMINAR";
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (confirmation !== expectedConfirmation) {
    accountError(tr(l, `Escreve exatamente ${expectedConfirmation} para confirmar.`, `Type exactly ${expectedConfirmation} to confirm.`));
  }
  if (!password || password.length > 512) {
    accountError(tr(l, "Introduz a tua password atual.", "Enter your current password."));
  }

  const admin = createSupabaseAdmin();
  const { data: platformAdmin, error: adminCheckError } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (adminCheckError) throw adminCheckError;
  if (platformAdmin) {
    accountError(tr(l, "Esta conta também administra o Momo. Contacta a equipa para a eliminar.", "This account also administers Momo. Contact the team to delete it."));
  }

  // Re-authenticate using a separate, non-persistent client. Never trust a
  // confirmation or browser session alone for a destructive operation.
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data: verified, error: verificationError } = await verifier.auth.signInWithPassword({
    email: session.email,
    password,
  });
  if (verificationError || verified.user?.id !== session.userId) {
    accountError(tr(l, "Password incorreta. A conta não foi eliminada.", "Incorrect password. Your account was not deleted."));
  }
  // Sign out only the temporary verification session, not the browser session.
  const { error: temporarySignOutError } = await verifier.auth.signOut({ scope: "local" });
  if (temporarySignOutError) console.error("[account-deletion] Could not close verification session:", temporarySignOutError);

  let removed: RemovedMembership;
  try {
    removed = await revokeMembershipGuarded(session.organizationId, session.userId);
  } catch (reason) {
    if (reason instanceof LastActiveOwnerError) {
      accountError(tr(
        l,
        "És o último Owner ativo. Pede a eliminação nesta página para a equipa tratar da transferência ou encerramento.",
        "You are the last active Owner. Submit a request on this page so the team can arrange a transfer or closure.",
      ));
    }
    console.error("[account-deletion] Could not revoke membership:", reason);
    accountError(tr(l, "Não foi possível eliminar a conta. Nenhuma alteração foi concluída.", "Could not delete the account. No change was completed."));
  }

  // A removed membership blocks all Portal operations immediately, even if a
  // previously issued access token remains valid until its normal expiry.
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(session.userId);
  if (authDeleteError) {
    console.error("[account-deletion] Could not delete Auth user:", authDeleteError);
    try {
      await restoreMembership(removed);
    } catch (restoreError) {
      // Retaining the revoked membership is safer than accidentally restoring
      // access after an uncertain deletion. Manual intervention is required.
      console.error("[account-deletion] URGENT: membership restoration failed:", {
        userId: session.userId,
        organizationId: session.organizationId,
        restoreError,
      });
      redirect(`/portal/login?lang=${l}&error=${encodeURIComponent(tr(l, "O acesso foi bloqueado, mas não foi possível concluir a eliminação. Contacta a equipa Momo.", "Access was blocked, but deletion could not be completed. Contact the Momo team."))}`);
    }
    accountError(tr(l, "Não foi possível concluir a eliminação. Mantivemos o teu acesso. Contacta o suporte.", "Could not complete deletion. Your access was restored. Contact support."));
  }

  const browserSession = await createSupabaseServerClient();
  try {
    await browserSession.auth.signOut({ scope: "local" });
  } catch (reason) {
    console.error("[account-deletion] Could not clear current session:", reason);
  }
  redirect(`/portal/login?lang=${l}&deleted=1`);
}

/** Sole Owner can request deletion without orphaning the organisation. */
export async function requestLastOwnerAccountDeletion(formData: FormData) {
  const session = await requirePortal();
  const l = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  if (session.role !== "client_owner") {
    accountError(tr(l, "Esta opção é apenas para o último Owner.", "This option is only for the last Owner."));
  }
  const confirmation = String(formData.get("confirmation") ?? "").trim().toLowerCase();
  if (confirmation !== session.email.toLowerCase()) {
    accountError(tr(l, "Escreve o email da tua conta para confirmar o pedido.", "Enter your account email to confirm the request."));
  }

  const admin = createSupabaseAdmin();
  const { count, error: ownerError } = await admin
    .from("organization_members")
    .select("id", { head: true, count: "exact" })
    .eq("organization_id", session.organizationId)
    .eq("role", "client_owner")
    .not("accepted_at", "is", null)
    .neq("user_id", session.userId);
  if (ownerError) throw ownerError;
  if ((count ?? 0) > 0) {
    accountError(tr(l, "Já existe outro Owner ativo. Podes eliminar diretamente a tua conta nesta página.", "There is another active Owner. You can delete your account directly on this page."));
  }

  const { data: existing, error: existingError } = await admin
    .from("support_tickets")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("opened_by_user_id", session.userId)
    .eq("category", "privacy")
    .neq("status", "resolved")
    .in("subject", deleteRequestSubjects)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) {
    redirect(`/portal/support/${existing.id}?notice=${encodeURIComponent(tr(l, "Já tens um pedido de eliminação em aberto.", "You already have an open deletion request."))}`);
  }

  const subject = l === "en" ? deleteRequestSubjects[1] : deleteRequestSubjects[0];
  const initialMessage = tr(
    l,
    `Peço a eliminação da minha conta de utilizador (${session.email}). Sou o único Owner ativo de ${session.organizationName}. Preciso que a equipa coordene a transferência de responsabilidade ou o encerramento antes de eliminar o meu acesso. Não pedi aqui a eliminação dos dados da empresa.`,
    `I request deletion of my user account (${session.email}). I am the sole active Owner of ${session.organizationName}. Please arrange a responsibility transfer or closure before deleting my access. This is not a request to erase company data.`,
  );
  const ticket = await createSupportTicket({
    organizationId: session.organizationId,
    openedByUserId: session.userId,
    openedByEmail: session.email,
    subject,
    category: "privacy",
    priority: "high",
    summary: tr(l, "Pedido de eliminação pessoal do último Owner. Organizar transferência ou encerramento antes de eliminar a conta; não apagar dados da empresa automaticamente.", "Sole Owner requests personal account deletion. Arrange a transfer or closure first; do not erase company data automatically."),
    initialMessage,
    context: [{ role: "user", content: initialMessage }],
  });
  try {
    await sendNewSupportTicketNotification({
      ticketId: ticket.id,
      organizationName: session.organizationName,
      openedByEmail: session.email,
      subject: ticket.subject,
      summary: ticket.ai_summary,
      category: ticket.category,
      priority: ticket.priority,
    });
  } catch (reason) {
    console.error("[account-deletion] Support email notification failed:", reason);
  }
  revalidatePath("/portal/support");
  redirect(`/portal/support/${ticket.id}?notice=${encodeURIComponent(tr(l, "Pedido registado. A equipa vai contactar-te para tratar da eliminação da conta.", "Request received. The team will contact you about deleting your account."))}`);
}
