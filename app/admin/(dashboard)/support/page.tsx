import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getUnreadSupportTicketIds } from "@/lib/support/unread";
import {
  getAdminSupportTickets,
  supportCategoryLabel,
  supportStatusLabel,
  supportTicketReference,
} from "@/lib/support/tickets";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const [tickets, unread] = await Promise.all([
    getAdminSupportTickets(),
    getUnreadSupportTicketIds({ area: "admin", userId: admin.userId }),
  ]);
  const unreadIds = new Set(unread);
  const open = tickets.filter((ticket) => ticket.status !== "resolved").length;
  const newCount = tickets.filter((ticket) => ticket.status === "new").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Support</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pedidos de clientes</h1>
          <p className="mt-2 text-sm text-white/40">Questões encaminhadas pelo Momo Support e respostas da equipa.</p>
        </div>
        <Link href="/admin/support/knowledge" className="rounded-xl border border-[#ff7a18]/25 bg-[#ff7a18]/[0.06] px-4 py-2.5 text-sm text-[#ff9a4d] transition hover:bg-[#ff7a18]/[0.11]">
          Knowledge Base do Support →
        </Link>
      </div>

      {query.error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">{query.error}</div>}

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5"><p className="text-xs text-white/35">Total</p><p className="mt-2 text-2xl font-semibold">{tickets.length}</p></div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5"><p className="text-xs text-white/35">Novos</p><p className="mt-2 text-2xl font-semibold text-[#ff9b50]">{newCount}</p></div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5"><p className="text-xs text-white/35">Por resolver</p><p className="mt-2 text-2xl font-semibold">{open}</p></div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
        {tickets.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/35">Ainda não existem pedidos de suporte.</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] md:grid-cols-[130px_180px_1fr_auto] md:items-center">
                <div><p className="text-xs font-semibold text-[#ff9b50]">{supportTicketReference(ticket.id)}</p><p className="mt-1 text-[11px] text-white/25">{new Date(ticket.updated_at).toLocaleDateString("pt-PT")}</p></div>
                <div className="min-w-0"><p className="truncate text-sm text-white/70">{ticket.organization_name}</p><p className="mt-1 text-[11px] text-white/30">{supportCategoryLabel(ticket.category)}</p></div>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{ticket.subject} {unreadIds.has(ticket.id) && <span className="ml-2 rounded-full bg-[#ff7a18]/15 px-2 py-0.5 text-[10px] font-semibold text-[#ff9b50]">Por ler</span>}</p><p className="mt-1 truncate text-xs text-white/30">{ticket.opened_by_email}</p></div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] ${ticket.status === "resolved" ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200/75" : ticket.status === "in_progress" ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-100/75" : "border-[#ff7a18]/20 bg-[#ff7a18]/[0.06] text-[#ff9b50]"}`}>{supportStatusLabel(ticket.status)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
