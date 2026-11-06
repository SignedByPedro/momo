"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePortalPremium } from "@/lib/portal/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses = ["new", "contacted", "won", "lost"] as const;

export async function portalLogout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}

export async function updatePortalLeadStatus(formData: FormData) {
  const session = await requirePortalPremium();
  const leadId = String(formData.get("leadId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!leadId || !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("organization_id", session.organizationId)
    .eq("source", "widget");

  if (error) throw error;
  revalidatePath("/portal");
  revalidatePath("/portal/leads");
}
