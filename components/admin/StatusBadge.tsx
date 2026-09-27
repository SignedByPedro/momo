import type { LeadStatus } from "@/lib/admin/data";
import type { UiLanguage } from "@/lib/i18n/ui";

const labels: Record<LeadStatus, readonly [string, string]> = {
  new: ["Novo", "New"],
  contacted: ["Contactado", "Contacted"],
  won: ["Cliente", "Client"],
  lost: ["Perdido", "Lost"],
};

const classes: Record<LeadStatus, string> = {
  new: "border-[#ff7a18]/25 bg-[#ff7a18]/[0.08] text-[#ff9a4d]",
  contacted: "border-blue-400/20 bg-blue-400/[0.07] text-blue-200",
  won: "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200",
  lost: "border-white/[0.08] bg-white/[0.04] text-white/45",
};

export function statusLabel(status: LeadStatus, language: UiLanguage = "pt") {
  const pair = labels[status];
  return pair ? (language === "en" ? pair[1] : pair[0]) : status;
}

export default function StatusBadge({ status, language = "pt" }: { status: LeadStatus; language?: UiLanguage }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${classes[status]}`}>{statusLabel(status, language)}</span>;
}
