import Link from "next/link";
import type { ReactNode } from "react";
import {
  legalConfig,
  legalIsPublished,
  type LegalLanguage,
} from "../legal-config";

const nav = {
  pt: [
    ["/legal/privacy", "Privacidade"],
    ["/legal/terms", "Termos"],
    ["/legal/dpa", "DPA"],
    ["/legal/subprocessors", "Subprocessadores"],
    ["/legal/cookies", "Cookies"],
    ["/legal/retention", "Retenção"],
  ],
  en: [
    ["/legal/privacy", "Privacy"],
    ["/legal/terms", "Terms"],
    ["/legal/dpa", "DPA"],
    ["/legal/subprocessors", "Subprocessors"],
    ["/legal/cookies", "Cookies"],
    ["/legal/retention", "Retention"],
  ],
} as const;

export function LegalShell({
  language,
  title,
  eyebrow,
  intro,
  path,
  children,
}: {
  language: LegalLanguage;
  title: string;
  eyebrow: string;
  intro?: string;
  path: string;
  children: ReactNode;
}) {
  const q = `?lang=${language}`;

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
          <Link href={`/legal${q}`} className="flex items-center gap-3 text-white no-underline">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff7a18] text-sm font-black text-[#17110d]">M</span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">Momo</span>
              <span className="block text-[11px] text-white/35">Legal Center</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <Link href={`${path}?lang=pt`} className={`rounded-lg px-2 py-1 ${language === "pt" ? "bg-white/[0.08] text-white" : "text-white/35 hover:text-white/60"}`}>PT</Link>
            <Link href={`${path}?lang=en`} className={`rounded-lg px-2 py-1 ${language === "en" ? "bg-white/[0.08] text-white" : "text-white/35 hover:text-white/60"}`}>EN</Link>
          </div>
        </header>

        {!legalIsPublished && (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-100/85">
            <strong className="font-semibold">{language === "en" ? "Legal draft." : "Rascunho jurídico."}</strong>{" "}
            {language === "en"
              ? "This page is prepared for review and must not be treated as the final customer agreement until the legal entity, contacts and final commercial/legal terms are confirmed."
              : "Esta página está preparada para revisão e não deve ser tratada como acordo final com clientes até serem confirmados a entidade legal, contactos e condições jurídico-comerciais finais."}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <nav className="grid gap-1 rounded-2xl border border-white/[0.07] bg-[#151515] p-2">
              {nav[language].map(([href, label]) => (
                <Link key={href} href={`${href}${q}`} className="rounded-xl px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.05] hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
            <p className="mt-4 px-2 text-[11px] leading-5 text-white/25">
              {language === "en" ? "Version" : "Versão"} {legalConfig.version} · {language === "en" ? "Updated" : "Atualizado"} {legalConfig.lastUpdated}
            </p>
          </aside>

          <article className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8a2d]">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
            {intro && <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/55">{intro}</p>}
            <div className="legal-copy mt-8 space-y-8">{children}</div>
          </article>
        </div>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-white/55">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2 marker:text-[#ff7a18]">{children}</ul>;
}

export function LegalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.08em] text-white/40">
          <tr>{headers.map((header) => <th key={header} className="border-b border-white/[0.07] px-4 py-3 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-white/[0.05] last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4 align-top leading-6 text-white/55">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function ExternalLegalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="text-[#ff9b52] underline decoration-[#ff9b52]/35 underline-offset-4 hover:text-[#ffb273]">{children}</a>;
}
