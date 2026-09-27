import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/auth";
import { getUnreadSupportTicketIds } from "@/lib/support/unread";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ids = await getUnreadSupportTicketIds({
    area: "portal",
    userId: session.userId,
    organizationId: session.organizationId,
  });
  return NextResponse.json({ count: ids.length }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
