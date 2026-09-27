import Link from "next/link";
import { legalIsPublished, type LegalLanguage } from "../legal-config";

export default function PublicLegalFooter({ language = "pt" }: { language?: LegalLanguage }) {
  if (!legalIsPublished) return null;
  const q = `?lang=${language}`;
  const en = language === "en";

  return (
    <footer className="fixed bottom-5 left-5 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/30 sm:bottom-7 sm:left-7">
      <span>© {new Date().getFullYear()} Momo</span>
      <Link className="transition hover:text-white/60" href={`/legal/privacy${q}`}>{en ? "Privacy" : "Privacidade"}</Link>
      <Link className="transition hover:text-white/60" href={`/legal/terms${q}`}>{en ? "Terms" : "Termos"}</Link>
      <Link className="transition hover:text-white/60" href={`/legal/subprocessors${q}`}>{en ? "Subprocessors" : "Subprocessadores"}</Link>
    </footer>
  );
}
