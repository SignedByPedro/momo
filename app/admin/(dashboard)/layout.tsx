import FormSubmitButton from "@/app/_components/FormSubmitButton";
import SessionKeeper from "@/components/auth/SessionKeeper";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import MomoIcon from "@/components/momo/MomoIcon";
import { requireAdmin } from "@/lib/admin/auth";
import { tr } from "@/lib/i18n/ui";
import { getUnreadSupportTicketIds } from "@/lib/support/unread";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const unreadSupport = await getUnreadSupportTicketIds({ area: "admin", userId: admin.userId });
  const l = admin.language;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <SessionKeeper />
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0d0d0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/admin" aria-label={tr(l, "Ir para o dashboard do Momo", "Go to the Momo dashboard")} className="rounded-full transition duration-200 hover:scale-[1.04] active:scale-[0.97]">
              <MomoIcon size={36} />
            </Link>
            <div>
              <div className="text-sm font-semibold">Momo</div>
              <div className="text-[11px] text-white/35">Admin dashboard</div>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 sm:block"><div className="mx-auto w-fit max-w-full"><AdminNav initialUnreadCount={unreadSupport.length} language={l} /></div></div>

          <div className="flex shrink-0 items-center gap-3">
            <Link href="/admin/account" className="hidden max-w-60 min-w-0 text-right transition hover:opacity-80 md:block" title={tr(l, "Abrir a minha conta", "Open my account")}>
              <p className="truncate text-xs text-white/65">{admin.email}</p>
              <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">{admin.role}</p>
            </Link>
            <form action={logout}>
              <FormSubmitButton className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.05] hover:text-white">
                {tr(l, "Sair", "Sign out")}
              </FormSubmitButton>
            </form>
          </div>
        </div>
        <div className="mx-auto block max-w-7xl px-5 pb-3 sm:hidden"><AdminNav initialUnreadCount={unreadSupport.length} language={l} /></div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">{children}</main>
    </div>
  );
}
