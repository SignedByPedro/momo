"use client";

import type { UiLanguage } from "@/lib/i18n/ui";

export default function OpenSupportButton({ language }: { language: UiLanguage }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("momo-support:open"))}
      className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#17110d] transition hover:bg-[#ff9348]"
    >
      {language === "en" ? "Open Momo Support" : "Abrir Momo Support"}
    </button>
  );
}
