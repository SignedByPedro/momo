import { getAdminSession } from "@/lib/admin/auth";
import { buildDemoStatsExcel } from "@/lib/demo/export-excel";
import { isDemoTableMissing, listDemoSessions } from "@/lib/demo/sessions";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await listDemoSessions({ limit: 5000 });
    const excel = buildDemoStatsExcel(sessions, admin.language);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `momo-demo-stats-${date}.xls`;

    return new Response(excel, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isDemoTableMissing(error)) {
      return Response.json({ error: "Demo storage is not ready." }, { status: 503 });
    }
    console.error("Demo export failed:", error);
    return Response.json({ error: "Could not export demo stats." }, { status: 500 });
  }
}
