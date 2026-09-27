"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function accountError(language: "pt" | "en", message: string): never {
  redirect(`/admin/account?error=${encodeURIComponent(message)}&lang=${language}`);
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
