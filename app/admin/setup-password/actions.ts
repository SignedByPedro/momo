"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";

function errorRedirect(message: string, language: "pt" | "en"): never {
  redirect(`/admin/setup-password?lang=${language}&error=${encodeURIComponent(message)}`);
}

export async function setAdminOwnerPassword(formData: FormData) {
  const language = normalizeUiLanguage(formData.get("language"));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8 || password.length > 512) {
    errorRedirect(
      tr(language, "A password deve ter pelo menos 8 caracteres.", "The password must be at least 8 characters long."),
      language,
    );
  }
  if (password !== confirm) {
    errorRedirect(tr(language, "As passwords não coincidem.", "The passwords do not match."), language);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user?.id || !user.email_confirmed_at) {
    errorRedirect(
      tr(
        language,
        "O convite ainda não foi validado. Abre novamente o link recebido por email.",
        "The invitation has not been validated yet. Open the link from the invitation email again.",
      ),
      language,
    );
  }

  const admin = createSupabaseAdmin();
  const { data: adminAccess, error: accessError } = await admin
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accessError || adminAccess?.role !== "owner") {
    errorRedirect(
      tr(language, "Este convite não dá acesso de Owner ao Momo Admin.", "This invitation does not grant Owner access to Momo Admin."),
      language,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    errorRedirect(
      tr(language, "Não foi possível definir a password. Tenta novamente.", "Could not set the password. Please try again."),
      language,
    );
  }

  redirect("/admin");
}
