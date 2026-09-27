import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalRole } from "@/lib/portal/auth";

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  role: PortalRole;
  invited_at: string;
  accepted_at: string | null;
};

export async function getOrganizationMembers(organizationId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, email, role, invited_at, accepted_at")
    .eq("organization_id", organizationId)
    .order("invited_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OrganizationMemberRow[];
}

export async function getOrganizationMemberUsage(organizationId: string) {
  const supabase = createSupabaseAdmin();
  const [{ count, error: countError }, { data: organization, error: organizationError }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("organizations")
      .select("member_limit")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  if (countError) throw countError;
  if (organizationError) throw organizationError;

  const used = count ?? 0;
  const limit = Math.max(1, Number(organization?.member_limit ?? 2));
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    full: used >= limit,
  };
}
