import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UiLanguage } from "@/lib/i18n/ui";

export type AdminSession = {
  userId: string;
  email: string;
  role: "owner" | "admin";
  language: UiLanguage;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const userId = String(data.claims.sub);
  const admin = createSupabaseAdmin();
  const { data: adminUser, error: adminError } = await admin
    .from("admin_users")
    .select("user_id, email, role, ui_language")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminError || !adminUser) return null;

  return {
    userId,
    email: adminUser.email ?? String(data.claims.email ?? ""),
    role: adminUser.role === "owner" ? "owner" : "admin",
    language: adminUser.ui_language === "en" ? "en" : "pt",
  };
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
