import Link from "next/link";
import SupportUnreadBadge from "@/components/support/SupportUnreadBadge";
import type { PortalRole } from "@/lib/portal/auth";
import type { UiLanguage } from "@/lib/i18n/ui";
import { tr } from "@/lib/i18n/ui";

export default function PortalNav({
  role,
  language,
  serviceClosed = false,
  initialUnreadCount = 0,
}: {
  role: PortalRole;
  language: UiLanguage;
  serviceClosed?: boolean;
  initialUnreadCount?: number;
}) {
  const itemClass = "whitespace-nowrap rounded-lg px-3 py-2 text-white/65 transition hover:bg-white/[0.05] hover:text-white";
  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-1 text-sm">
      <Link className={itemClass} href="/portal">Dashboard</Link>
      <Link className={itemClass} href="/portal/conversations">{tr(language, "Conversas", "Conversations")}</Link>
      <Link className={itemClass} href="/portal/leads">Leads</Link>
      <Link className={`${itemClass} relative`} href="/portal/support">Support<SupportUnreadBadge area="portal" initialCount={initialUnreadCount} language={language} /></Link>
      <Link className={itemClass} href="/portal/account">{tr(language, "A minha conta", "My account")}</Link>
      {role === "client_owner" && !serviceClosed && (
        <>
          <Link className={itemClass} href="/portal/settings">{tr(language, "Empresa", "Company")}</Link>
          <Link className={itemClass} href="/portal/knowledge">{tr(language, "Conhecimento", "Knowledge")}</Link>
          <Link className={itemClass} href="/portal/agent">{tr(language, "Agente", "Agent")}</Link>
          <Link className={itemClass} href="/portal/widget">Widget</Link>
          <Link className={itemClass} href="/portal/team">{tr(language, "Equipa", "Team")}</Link>
        </>
      )}
    </nav>
  );
}
