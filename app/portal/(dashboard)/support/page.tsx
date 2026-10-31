import Link from "next/link";
import { requirePortal } from "@/lib/portal/auth";
import { getUnreadSupportTicketIds } from "@/lib/support/unread";
import {
  getPortalSupportTickets,
  supportCategoryLabel,
  supportStatusLabel,
  supportTicketReference,
} from "@/lib/support/tickets";
import { dateLocale, tr } from "@/lib/i18n/ui";

export default async function PortalSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePortal();
  const query = await searchParams;
  const [tickets, unread] = await Promise.all([
    getPortalSupportTickets(session.organizationId),
    getUnreadSupportTicketIds({ area: "portal", userId: session.userId, organizationId: session.organizationId }),
  ]);
  const unreadIds = new Set(unread);
  const l = session.language;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Momo Support</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Support</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            {tr(l, "O Momo ajuda-te 24/7. Se quiseres falar diretamente com a equipa, também podes criar um ticket manualmente.", "Momo helps you 24/7. If you want to contact the team directly, you can also create a ticket manually.")}
          </p>
        </div>
        <Link
          href="/portal/support/new"
          className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#17110d] transition hover:bg-[#ff9348]"
        >
          {tr(l, "Criar ticket", "Create ticket")}
        </Link>
      </div>

      {query.error && (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">
          {query.error}
        </div>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold">{tr(l, "Pedidos à equipa", "Requests to the team")}</h2>
        </div>

        {tickets.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-white/55">{tr(l, "Ainda não tens pedidos de suporte.", "You don't have any support requests yet.")}</p>
            <p className="mt-2 text-xs text-white/30">{tr(l, "Usa o Momo Support no canto inferior direito sempre que precisares.", "Use Momo Support in the bottom-right corner whenever you need it.")}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/portal/support/${ticket.id}`}
                className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[130px_1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-xs font-semibold text-[#ff9b50]">{supportTicketReference(ticket.id)}</p>
                  <p className="mt-1 text-[11px] text-white/30">{new Date(ticket.updated_at).toLocaleDateString(dateLocale(l))}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{ticket.subject} {unreadIds.has(ticket.id) && <span className="ml-2 rounded-full bg-[#ff7a18]/15 px-2 py-0.5 text-[10px] font-semibold text-[#ff9b50]">{tr(l, "Por ler", "Unread")}</span>}</p>
                  <p className="mt-1 text-xs text-white/35">{supportCategoryLabel(ticket.category, l)}</p>
                </div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] ${ticket.status === "resolved" ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200/75" : ticket.status === "in_progress" ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-100/75" : "border-[#ff7a18]/20 bg-[#ff7a18]/[0.06] text-[#ff9b50]"}`}>
                  {supportStatusLabel(ticket.status, l)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
