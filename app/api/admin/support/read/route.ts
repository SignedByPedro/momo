import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { markSupportTicketSeen } from "@/lib/support/unread";

export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { ticketId, lastMessageId } = payload as { ticketId?: unknown; lastMessageId?: unknown };
  if (typeof ticketId !== "string" || !uuid.test(ticketId) ||
      !(lastMessageId === null || (typeof lastMessageId === "string" && uuid.test(lastMessageId)))) {
    return NextResponse.json({ error: "Invalid ticket or message" }, { status: 400 });
  }

  const saved = await markSupportTicketSeen({
    area: "admin", userId: admin.userId, ticketId, lastMessageId,
  });
  return NextResponse.json({ ok: saved }, {
    status: saved ? 200 : 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}
