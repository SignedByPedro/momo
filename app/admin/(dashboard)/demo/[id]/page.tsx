import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getConversation } from "@/lib/admin/data";
import { getDemoSession, isDemoTableMissing } from "@/lib/demo/sessions";
import { demoPhaseLabel, priceLabel } from "@/lib/demo/script";
import { dateLocale, tr } from "@/lib/i18n/ui";
import { validConversationId } from "@/lib/security/request-security";

export const dynamic = "force-dynamic";

function formatDate(value: string, language: "pt" | "en") {
  return new Intl.DateTimeFormat(dateLocale(language), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function DemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validConversationId(id)) notFound();

  const admin = await requireAdmin();
  const l = admin.language;

  let session = null;
  try {
    session = await getDemoSession(id);
  } catch (error) {
    if (isDemoTableMissing(error)) notFound();
    throw error;
  }
  if (!session) notFound();

  const linked = session.freeConversationId ? await getConversation(session.freeConversationId) : null;
  const interest =
    session.interested === true
      ? tr(l, "Sim", "Yes")
      : session.interested === false
        ? tr(l, "Ainda não", "Not yet")
        : "—";

  return (
    <div className="max-w-4xl">
      <Link href="/admin/demo" className="text-sm text-white/40 transition hover:text-white">
        ← Demo
      </Link>

      <div className="mt-5 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Demo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{session.visitorName || tr(l, "Sem nome", "No name")}</h1>
        <p className="mt-2 text-sm text-white/40">
          {formatDate(session.createdAt, l)} · {demoPhaseLabel(session.phase, l)}
        </p>

        <div className="mt-8 grid gap-6 border-t border-white/[0.07] pt-7 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/30">{tr(l, "Valor mensal", "Monthly price")}</p>
            <p className="mt-2 text-sm text-white/80">{session.priceBand ? priceLabel(session.priceBand) : "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/30">{tr(l, "Interesse", "Interest")}</p>
            <p className="mt-2 text-sm text-white/80">{interest}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/30">Email</p>
            <p className="mt-2 break-all text-sm text-white/80">{session.email || "—"}</p>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-sm font-semibold">{tr(l, "Diálogo", "Dialogue")}</h2>
        <div className="mt-5 space-y-3">
          {session.transcript.map((turn, index) => (
            <div key={`${turn.at}-${index}`} className={turn.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
              <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-white/30">
                {turn.role === "user" ? tr(l, "Visitante", "Visitor") : "Momo"}
              </p>
              <div
                className={
                  turn.role === "user"
                    ? "whitespace-pre-wrap rounded-2xl bg-[#ff7a18] px-4 py-3 text-sm leading-6 text-[#1a1008]"
                    : "whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-[#101010] px-4 py-3 text-sm leading-6 text-white/80"
                }
              >
                {turn.text}
              </div>
            </div>
          ))}
        </div>

        {linked?.conversation && (
          <Link
            href={`/admin/conversations/${linked.conversation.id}`}
            className="mt-6 inline-flex rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/65 transition hover:border-[#ff7a18]/25 hover:text-[#ff9a4d]"
          >
            {tr(l, "Ver o chat livre na conversa normal", "Open the free chat in the normal conversation")} →
          </Link>
        )}
      </section>
    </div>
  );
}
