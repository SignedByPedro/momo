import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Snapshot produced atomically by the service-only SQL function. */
export type RemovedMembership = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  role: "client_owner" | "client_member";
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
};

export class LastActiveOwnerError extends Error {
  constructor() {
    super("last_active_owner");
    this.name = "LastActiveOwnerError";
  }
}

/**
 * Guard the last accepted owner under an organization-level database lock.
 * Only call this after the server has verified the current user's privileges.
 */
export async function revokeMembershipGuarded(organizationId: string, userId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("revoke_organization_membership_guarded", {
    p_organization_id: organizationId,
    p_user_id: userId,
  });

  if (error?.message.includes("last_active_owner")) throw new LastActiveOwnerError();
  if (error) throw error;

  const row = data as RemovedMembership | null;
  if (!row || row.organization_id !== organizationId || row.user_id !== userId ||
    !["client_owner", "client_member"].includes(row.role)) {
    throw new Error("Unexpected membership revocation result.");
  }
  return row;
}

/** Restore access after an unsuccessful Auth deletion. Throws if restoration fails. */
export async function restoreMembership(row: RemovedMembership) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("organization_members").insert({
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    email: row.email,
    role: row.role,
    invited_by: row.invited_by,
    invited_at: row.invited_at,
    accepted_at: row.accepted_at,
    created_at: row.created_at,
  });
  if (error) throw error;
}
