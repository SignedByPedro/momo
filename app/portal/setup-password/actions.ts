"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";

function errorRedirect(message: string, language: "pt" | "en"): never { redirect(`/portal/setup-password?lang=${language}&error=${encodeURIComponent(message)}`); }

export async function setPortalPassword(formData: FormData) {
  const language = normalizeUiLanguage(formData.get("language"));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) errorRedirect(tr(language,"A password deve ter pelo menos 8 caracteres.","The password must be at least 8 characters long."), language);
  if (password !== confirm) errorRedirect(tr(language,"As passwords não coincidem.","The passwords do not match."), language);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id || !data.user.email_confirmed_at) errorRedirect(tr(language,"O convite ainda não foi validado. Abre novamente o link recebido por email.","The invitation has not been validated yet. Open the link from the invitation email again."), language);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) errorRedirect(tr(language,"Não foi possível definir a password. Tenta novamente.","Could not set the password. Please try again."), language);
  const admin = createSupabaseAdmin();
  const { error: membershipError } = await admin.from("organization_members").update({ accepted_at: new Date().toISOString() }).eq("user_id", data.user.id);
  if (membershipError) errorRedirect(tr(language,"A conta foi confirmada, mas não foi possível ativar o acesso ao portal.","The account was confirmed, but portal access could not be activated."), language);
  redirect("/portal");
}
