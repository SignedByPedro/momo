"use client";

import { useState } from "react";

export default function CopyInstallCode({ code, language = "pt" }: { code: string; language?: "pt" | "en" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-xs text-white/55 transition hover:border-[#ff7a18]/30 hover:text-white"
    >
      {copied ? (language === "en" ? "Copied ✓" : "Copiado ✓") : (language === "en" ? "Copy script" : "Copiar script")}
    </button>
  );
}
