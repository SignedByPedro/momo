"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function accountError(language: "pt" | "en", message: string): never {
  redirect(`/admin/account?error=${encodeURIComponent(message)}&lang=${language}`);
}

function accountNotice(language: "pt" | "en", message: string): never {
  redirect(`/admin/account?notice=${encodeURIComponent(message)}&lang=${language}`);
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

export async function inviteAdminOwner(formData: FormData) {
  const session = await requireAdmin();
  const language = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);

  if (session.role !== "owner") {
    accountError(language, tr(language, "Só um Owner pode convidar outro Owner.", "Only an Owner can invite another Owner."));
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  if (!emailPattern.test(email)) {
    accountError(language, tr(language, "Introduz um endereço de email válido.", "Enter a valid email address."));
  }
  if (email === session.email.toLowerCase()) {
    accountError(language, tr(language, "Este email já pertence à tua conta.", "This email already belongs to your account."));
  }

  const admin = createSupabaseAdmin();
  const { data: existingAdmin, error: existingAdminError } = await admin
    .from("admin_users")
    .select("user_id, role")
    .eq("email", email)
    .maybeSingle();

  if (existingAdminError) {
    console.error("[admin-owner-invite] Could not check existing Admin access:", existingAdminError);
    accountError(language, tr(language, "Não foi possível validar este email. Tenta novamente.", "Could not validate this email. Please try again."));
  }
  if (existingAdmin) {
    accountError(
      language,
      existingAdmin.role === "owner"
        ? tr(language, "Este email já é Owner do Momo Admin.", "This email is already a Momo Admin Owner.")
        : tr(language, "Este email já tem acesso ao Momo Admin.", "This email already has access to Momo Admin."),
    );
  }

  const origin = await appOrigin();
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/admin/accept-invite?lang=${language}`,
    data: {
      momo_admin_role: "owner",
      momo_admin_invited_by: session.userId,
      momo_admin_language: language,
    },
  });

  if (inviteError || !inviteData.user?.id) {
    console.error("[admin-owner-invite] Could not create Auth invite:", {
      email,
      error: inviteError?.message ?? "Missing invited user",
    });
    const alreadyRegistered = inviteError?.message.toLowerCase().includes("already") ?? false;
    accountError(
      language,
      alreadyRegistered
        ? tr(
            language,
            "Este email já possui uma conta no Momo e não pode ser convidado automaticamente como Owner.",
            "This email already has a Momo account and cannot be invited automatically as an Owner.",
          )
        : tr(language, "Não foi possível enviar o convite. Tenta novamente.", "Could not send the invite. Please try again."),
    );
  }

  const { error: grantError } = await admin.from("admin_users").insert({
    user_id: inviteData.user.id,
    email,
    role: "owner",
    ui_language: language,
  });

  if (grantError) {
    await admin.auth.admin.deleteUser(inviteData.user.id);
    console.error("[admin-owner-invite] Could not grant Owner access:", {
      email,
      userId: inviteData.user.id,
      error: grantError.message,
    });
    accountError(
      language,
      tr(language, "O convite não ficou concluído. Tenta novamente.", "The invite could not be completed. Please try again."),
    );
  }

  revalidatePath("/admin/account");
  accountNotice(
    language,
    tr(
      language,
      `Convite de Owner enviado para ${email}. O acesso fica pronto depois de confirmar o email e criar a password.`,
      `Owner invite sent to ${email}. Access will be ready after the email is confirmed and a password is created.`,
    ),
  );
}

export async function updateAdminUiLanguage(formData: FormData) {
  const session = await requireAdmin();
  const language = normalizeUiLanguage(formData.get("language"));
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("admin_users")
    .update({ ui_language: language })
    .eq("user_id", session.userId);

  if (error) {
    console.error("[admin-account] Could not update UI language:", {
      userId: session.userId,
      error: error.message,
    });
    accountError(
      session.language,
      tr(session.language, "Não foi possível alterar o idioma da interface.", "Could not change the interface language."),
    );
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/account");
  redirect(`/admin/account?notice=${encodeURIComponent(tr(language, "Idioma da interface atualizado.", "Interface language updated."))}`);
}

export async function changeMyAdminPassword(formData: FormData) {
  const session = await requireAdmin();
  const language = normalizeUiLanguage(formData.get("uiLanguage") ?? session.language);
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || currentPassword.length > 512) {
    accountError(language, tr(language, "Introduz a tua password atual.", "Enter your current password."));
  }
  if (newPassword.length < 8 || newPassword.length > 512) {
    accountError(language, tr(language, "A nova password deve ter pelo menos 8 caracteres.", "The new password must be at least 8 characters long."));
  }
  if (newPassword !== confirmPassword) {
    accountError(language, tr(language, "As novas passwords não coincidem.", "The new passwords do not match."));
  }
  if (newPassword === currentPassword) {
    accountError(language, tr(language, "Escolhe uma password diferente da atual.", "Choose a password different from your current password."));
  }

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
    accountError(language, tr(language, "Password atual incorreta.", "Current password is incorrect."));
  }

  const { error: temporarySignOutError } = await verifier.auth.signOut({ scope: "local" });
  if (temporarySignOutError) {
    console.error("[admin-password-change] Could not close temporary verification session:", temporarySignOutError);
  }

  const admin = createSupabaseAdmin();
  const { error: updateError } = await admin.auth.admin.updateUserById(session.userId, {
    password: newPassword,
  });
  if (updateError) {
    console.error("[admin-password-change] Could not update password:", {
      userId: session.userId,
      error: updateError.message,
    });
    accountError(language, tr(language, "Não foi possível alterar a password. Tenta novamente.", "Could not change the password. Please try again."));
  }

  revalidatePath("/admin/account");
  redirect(`/admin/account?notice=${encodeURIComponent(tr(language, "Password alterada com sucesso.", "Password changed successfully."))}`);
}
