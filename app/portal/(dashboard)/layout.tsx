import FormSubmitButton from "@/app/_components/FormSubmitButton";
import SessionKeeper from "@/components/auth/SessionKeeper";
import Link from "next/link";
import PortalNav from "@/components/portal/PortalNav";
import MomoIcon from "@/components/momo/MomoIcon";
import MomoSupportChat from "@/components/portal/MomoSupportChat";
import { portalServiceIsClosed, requirePortal } from "@/lib/portal/auth";
import { portalLogout } from "./actions";
import { requestOrganizationDataDeletion } from "./settings/actions";
import { tr } from "@/lib/i18n/ui";
import { getServerTimeMs } from "@/lib/server-time";
import { getUnreadSupportTicketIds } from "@/lib/support/unread";
import { organizationPlanLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";

function formatDate(value: string | null, language: "pt" | "en") {
  if (!value) return null;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "pt-PT", {
    dateStyle: "long",
  }).format(new Date(value));
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortal();
  const unreadSupport = await getUnreadSupportTicketIds({
    area: "portal", userId: session.userId, organizationId: session.organizationId,
  });
  const serviceClosed = portalServiceIsClosed(session);
  const serverNow = getServerTimeMs();
  const recoveryExpired = Boolean(
    session.recoveryUntil && new Date(session.recoveryUntil).getTime() <= serverNow,
  );
  const purgePending = session.organizationStatus === "purge_due" || recoveryExpired;
  const recoveryDate = formatDate(session.recoveryUntil, session.language);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <SessionKeeper />
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0d0d0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 pb-3 pt-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0"><MomoIcon size={36} /></div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{session.organizationName}</div>
              <div className="text-[11px] text-white/35">{tr(session.language, "Portal de IA", "Customer AI portal")} · {organizationPlanLabel(session.plan)}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden max-w-60 min-w-0 text-right md:block">
              <p className="truncate text-xs text-white/65" title={session.email}>{session.email}</p>
              <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">{session.role === "client_owner" ? "OWNER" : "MEMBER"}</p>
            </div>
            <form action={portalLogout} className="shrink-0">
              <FormSubmitButton className="whitespace-nowrap rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.05] hover:text-white">{tr(session.language, "Sair", "Sign out")}</FormSubmitButton>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl overflow-x-auto px-5 pb-3 lg:px-8">
          <PortalNav role={session.role} language={session.language} plan={session.plan} serviceClosed={serviceClosed} initialUnreadCount={unreadSupport.length} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {serviceClosed && (
          <section className="mb-8 rounded-3xl border border-sky-400/15 bg-[#151515] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-sky-200/80">
                {purgePending
                  ? tr(session.language, "Janela terminada", "Recovery window ended")
                  : tr(session.language, "Modo de recuperação", "Recovery mode")}
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              {tr(session.language, "O serviço desta organização está encerrado.", "This organisation's service is closed.")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
              {purgePending
                ? tr(
                    session.language,
                    "A janela de recuperação terminou e os dados estão pendentes de eliminação final. O widget público e as alterações de configuração continuam bloqueados. Podes consultar/exportar dados e contactar o suporte enquanto a revisão final não for concluída.",
                    "The recovery window has ended and the data is pending final deletion. The public widget and configuration changes remain blocked. You can review/export data and contact support until the final review is completed.",
                  )
                : tr(
                    session.language,
                    recoveryDate
                      ? `O widget público e as alterações de configuração estão suspensos. Podes consultar os teus dados, exportá-los e contactar o suporte. A organização pode ser reativada pela equipa do Momo até ${recoveryDate}.`
                      : "O widget público e as alterações de configuração estão suspensos durante a janela de recuperação. Podes continuar a consultar/exportar dados e contactar o suporte.",
                    recoveryDate
                      ? `The public widget and configuration changes are suspended. You can review your data, export it and contact support. The organisation can be reactivated by the Momo team until ${recoveryDate}.`
                      : "The public widget and configuration changes are suspended during the recovery window. You can continue to review/export data and contact support.",
                  )}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {session.role === "client_owner" && (
                <a
                  href="/api/portal/data-export"
                  className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]"
                >
                  {tr(session.language, "Descarregar dados", "Download data")}
                </a>
              )}
              <Link href="/portal/support" className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white">
                {tr(session.language, "Abrir suporte", "Open support")}
              </Link>
            </div>

            {session.role === "client_owner" && (
              <div className="mt-7 border-t border-white/[0.06] pt-6">
                <p className="text-sm font-medium text-white/75">
                  {tr(session.language, "Queres eliminar os dados mais cedo?", "Want the data deleted earlier?")}
                </p>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/35">
                  {tr(
                    session.language,
                    "Um pedido explícito de eliminação é separado da janela de recuperação. Será criado um ticket de Privacidade para verificação antes da eliminação destrutiva.",
                    "An explicit deletion request is separate from the recovery window. A Privacy ticket will be created for verification before destructive deletion.",
                  )}
                </p>
                <form action={requestOrganizationDataDeletion} className="mt-4 flex max-w-2xl flex-col gap-3 sm:flex-row">
                  <input type="hidden" name="uiLanguage" value={session.language} />
                  <input
                    name="confirmation"
                    required
                    placeholder={tr(session.language, `Escreve ${session.organizationName}`, `Type ${session.organizationName}`)}
                    className="min-h-11 flex-1 rounded-xl border border-red-400/15 bg-[#101010] px-3 text-sm text-white outline-none focus:border-red-400/35"
                  />
                  <FormSubmitButton className="rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-semibold text-red-200/80 transition hover:bg-red-400/[0.08]">
                    {tr(session.language, "Pedir eliminação", "Request deletion")}
                  </FormSubmitButton>
                </form>
              </div>
            )}
          </section>
        )}

        {children}
      </main>

      <MomoSupportChat language={session.language} />
    </div>
  );
}
