import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { OrganizationPlan } from "@/lib/plans";

export type OrganizationStatus =
  | "setup"
  | "active"
  | "paused"
  | "cancelled"
  | "purge_due";
export type OrganizationLanguage = "pt" | "en";

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  business_type: string | null;
  country: string | null;
  primary_language: OrganizationLanguage;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  member_limit: number;
  terminated_at: string | null;
  recovery_until: string | null;
  termination_reason: string | null;
  status_before_termination: "setup" | "active" | "paused" | null;
  terminated_by_user_id: string | null;
  terminated_by_email: string | null;
  created_at: string;
  updated_at: string;
};

const organizationSelect =
  "id, name, slug, website, business_type, country, primary_language, plan, status, member_limit, terminated_at, recovery_until, termination_reason, status_before_termination, terminated_by_user_id, terminated_by_email, created_at, updated_at";

export async function getOrganizations() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select(organizationSelect)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OrganizationRow[];
}

export async function getOrganization(id: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select(organizationSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as OrganizationRow | null;
}

export async function getArchivedClientCount() {
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("client_history")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
