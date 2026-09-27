import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { getUnreadSupportTicketIds } from "@/lib/support/unread";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ids = await getUnreadSupportTicketIds({ area: "admin", userId: admin.userId });
  return NextResponse.json({ count: ids.length }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
