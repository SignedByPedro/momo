"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";

function errorRedirect(message: string, language: "pt" | "en"): never {
  redirect(`/portal/login?lang=${language}&error=${encodeURIComponent(message)}`);
}

export async function portalLogin(formData: FormData) {
  const language = normalizeUiLanguage(formData.get("language"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) errorRedirect(tr(language,"Preenche o email e a password.","Enter your email and password."), language);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) errorRedirect(tr(language,"Email ou password incorretos.","Incorrect email or password."), language);
  if (!data.user.email_confirmed_at) { await supabase.auth.signOut(); errorRedirect(tr(language,"Confirma primeiro o endereço de email através do convite recebido.","Confirm your email address using the invitation you received first."), language); }
  const admin = createSupabaseAdmin();
  const { data: membership, error: membershipError } = await admin.from("organization_members").select("id, accepted_at").eq("user_id", data.user.id).maybeSingle();
  if (membershipError || !membership) { await supabase.auth.signOut(); errorRedirect(tr(language,"Esta conta não tem acesso a nenhum portal de cliente.","This account does not have access to a client portal."), language); }
  if (!membership.accepted_at) { await supabase.auth.signOut(); errorRedirect(tr(language,"Conclui primeiro o convite recebido por email e define a tua password.","Complete the email invitation and set your password first."), language); }
  redirect("/portal");
}
