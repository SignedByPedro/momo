"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function errorRedirect(message: string): never {
  redirect(`/admin/login?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    errorRedirect("Preenche o email e a password.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorRedirect("Email ou password incorretos.");
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ? String(claimsData.claims.sub) : null;

  if (claimsError || !userId) {
    await supabase.auth.signOut();
    errorRedirect("Não foi possível validar a sessão.");
  }

  const admin = createSupabaseAdmin();
  const { data: adminUser, error: adminError } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminError || !adminUser) {
    await supabase.auth.signOut();
    errorRedirect("Esta conta não tem acesso ao painel do Momo.");
  }

  redirect("/admin");
}
