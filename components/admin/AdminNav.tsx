import Link from "next/link";
import SupportUnreadBadge from "@/components/support/SupportUnreadBadge";
import { tr, type UiLanguage } from "@/lib/i18n/ui";

export default function AdminNav({
  initialUnreadCount = 0,
  language = "pt",
}: {
  initialUnreadCount?: number;
  language?: UiLanguage;
}) {
  const itemClass = "whitespace-nowrap rounded-lg px-3 py-2 text-white/65 transition hover:bg-white/[0.05] hover:text-white";
  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-1 text-sm">
      <Link className={itemClass} href="/admin">Leads</Link>
      <Link className={itemClass} href="/admin/clients">{tr(language, "Clientes", "Clients")}</Link>
      <Link className={itemClass} href="/admin/conversations">{tr(language, "Conversas", "Conversations")}</Link>
      <Link className={itemClass} href="/admin/demo">Demo</Link>
      <Link className={itemClass} href="/admin/knowledge">{tr(language, "Conhecimento", "Knowledge")}</Link>
      <Link className={`${itemClass} relative`} href="/admin/support">
        Support<SupportUnreadBadge area="admin" initialCount={initialUnreadCount} language={language} />
      </Link>
      <Link className={itemClass} href="/admin/retention">{tr(language, "Retenção", "Retention")}</Link>
      <Link className={itemClass} href="/admin/account">{tr(language, "A minha conta", "My account")}</Link>
    </nav>
  );
}
