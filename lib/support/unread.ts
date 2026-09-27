import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type SupportReaderArea = "admin" | "portal";

/** Only call after checking the authenticated Admin/Portal session on the server. */
export async function getUnreadSupportTicketIds(input: {
  area: SupportReaderArea;
  userId: string;
  organizationId?: string;
}): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("support_unread_ticket_ids", {
    p_reader_user_id: input.userId,
    p_reader_area: input.area,
    p_organization_id: input.area === "portal" ? input.organizationId ?? null : null,
  });

  if (error) {
    // Alerts must not prevent someone from accessing the Admin or Portal if
    // Supabase is temporarily unavailable. Keep the failure visible in logs.
    console.error("[support-alerts] Failed to fetch unread tickets:", error);
    return [];
  }

  return (data ?? [])
    .map((row: { ticket_id?: unknown }) => row.ticket_id)
    .filter((id: unknown): id is string => typeof id === "string");
}

/** Only call after checking the authenticated Admin/Portal session on the server. */
export async function markSupportTicketSeen(input: {
  area: SupportReaderArea;
  userId: string;
  ticketId: string;
  lastMessageId: string | null;
  organizationId?: string;
}): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("support_mark_ticket_seen", {
    p_reader_user_id: input.userId,
    p_reader_area: input.area,
    p_ticket_id: input.ticketId,
    p_last_message_id: input.lastMessageId,
    p_organization_id: input.area === "portal" ? input.organizationId ?? null : null,
  });
  if (error) {
    console.error("[support-alerts] Failed to mark ticket read:", error);
    return false;
  }
  return data === true;
}
