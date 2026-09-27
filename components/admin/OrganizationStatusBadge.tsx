import type { OrganizationStatus } from "@/lib/admin/organizations";
import type { UiLanguage } from "@/lib/i18n/ui";

const labels: Record<OrganizationStatus, readonly [string, string]> = {
  setup: ["Configuração", "Setup"],
  active: ["Ativo", "Active"],
  paused: ["Pausado", "Paused"],
  cancelled: ["Em recuperação", "Recovery"],
  purge_due: ["Eliminação pendente", "Deletion pending"],
};

const styles: Record<OrganizationStatus, string> = {
  setup: "border-amber-400/15 bg-amber-400/[0.06] text-amber-300/80",
  active: "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300/80",
  paused: "border-white/[0.08] bg-white/[0.035] text-white/45",
  cancelled: "border-sky-400/15 bg-sky-400/[0.06] text-sky-200/80",
  purge_due: "border-red-400/20 bg-red-400/[0.06] text-red-200/80",
};

export function organizationStatusLabel(status: OrganizationStatus, language: UiLanguage = "pt") {
  const pair = labels[status];
  return pair ? (language === "en" ? pair[1] : pair[0]) : status;
}

export default function OrganizationStatusBadge({ status, language = "pt" }: { status: OrganizationStatus; language?: UiLanguage }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] ${styles[status]}`}>
      {organizationStatusLabel(status, language)}
    </span>
  );
}
