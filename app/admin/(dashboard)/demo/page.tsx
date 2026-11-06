import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { isDemoTableMissing, listDemoSessions } from "@/lib/demo/sessions";
import { demoPhaseLabel, priceLabel, type DemoSessionState } from "@/lib/demo/script";
import { dateLocale, tr } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

function formatDate(value: string, language: "pt" | "en") {
  return new Intl.DateTimeFormat(dateLocale(language), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function interestLabel(session: DemoSessionState, language: "pt" | "en") {
  if (session.interested === true) return tr(language, "Sim", "Yes");
  if (session.interested === false) return tr(language, "Não estou interessado", "Not interested");
  return "—";
}

export default async function DemoAdminPage() {
  const admin = await requireAdmin();
  const l = admin.language;
  let sessions: DemoSessionState[] = [];
  let missing = false;

  try {
    sessions = await listDemoSessions();
  } catch (error) {
    if (!isDemoTableMissing(error)) throw error;
    missing = true;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Demo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr(l, "Estudo de mercado", "Market study")}</h1>
          <p className="mt-2 text-sm text-white/40">
            {tr(l, "Respostas recolhidas na página /demo.", "Answers collected on the /demo page.")}
          </p>
        </div>
        {!missing && sessions.length > 0 && (
          <a
            href="/api/admin/demo/export"
            className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-white/65 transition hover:border-[#ff7a18]/30 hover:text-[#ff9a4d]"
          >
            {tr(l, "Exportar Excel", "Export Excel")}
          </a>
        )}
      </div>

      {missing && (
        <div className="mt-6 rounded-2xl border border-[#ff8426]/20 bg-[#ff8426]/[0.08] px-4 py-3 text-sm leading-6 text-white/75">
          {tr(
            l,
            "A tabela demo_sessions ainda não existe. Executa supabase/v3.54-demo-sessions.sql no SQL Editor e volta a abrir esta página.",
            "The demo_sessions table does not exist yet. Run supabase/v3.54-demo-sessions.sql in the SQL Editor and reopen this page.",
          )}
        </div>
      )}

      {!missing && (
        <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
          {sessions.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-white/35">
              {tr(l, "Ainda não há respostas.", "There are no responses yet.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-white/30">
                  <tr>
                    <th className="px-5 py-3 font-medium">{tr(l, "Nome", "Name")}</th>
                    <th className="px-5 py-3 font-medium">{tr(l, "Valor", "Price")}</th>
                    <th className="px-5 py-3 font-medium">{tr(l, "Interesse", "Interest")}</th>
                    <th className="px-5 py-3 font-medium">{tr(l, "Contacto", "Contact")}</th>
                    <th className="px-5 py-3 font-medium">{tr(l, "Fase", "Stage")}</th>
                    <th className="px-5 py-3 font-medium">{tr(l, "Data", "Date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {sessions.map((session) => (
                    <tr key={session.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link href={`/admin/demo/${session.id}`} className="font-medium text-white hover:text-[#ff9a4d]">
                          {session.visitorName || tr(l, "Sem nome", "No name")}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-white/70">{session.priceBand ? priceLabel(session.priceBand) : "—"}</td>
                      <td className="px-5 py-3 text-white/70">{interestLabel(session, l)}</td>
                      <td className="px-5 py-3 text-white/70">{session.email || "—"}</td>
                      <td className="px-5 py-3 text-white/55">{demoPhaseLabel(session.phase, l)}</td>
                      <td className="px-5 py-3 text-white/40">{formatDate(session.createdAt, l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
