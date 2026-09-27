"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UiLanguage } from "@/lib/i18n/ui";

export default function AcceptInviteClient({ language }: { language: UiLanguage }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const en = language === "en";
  useEffect(() => {
    let cancelled = false;
    async function accept() {
      const supabase = createSupabaseBrowserClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      try {
        if (code) { const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code); if (exchangeError) throw exchangeError; }
        else if (accessToken && refreshToken) { const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }); if (sessionError) throw sessionError; }
        else { const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error(en ? "The invitation does not contain a valid session." : "O convite não contém uma sessão válida."); }
        if (!cancelled) router.replace(`/portal/setup-password?lang=${language}`);
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : en ? "Could not accept the invitation." : "Não foi possível aceitar o convite."); }
    }
    void accept(); return () => { cancelled = true; };
  }, [en, language, router]);
  return <main className="grid min-h-screen place-items-center bg-[#0d0d0d] px-5 text-white"><div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#151515] p-7 text-center shadow-2xl"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-[#ff7a18]"/><h1 className="mt-5 text-xl font-semibold">{en ? "Confirming invitation…" : "A confirmar o convite…"}</h1><p className="mt-2 text-sm leading-6 text-white/40">{en ? "We're validating your email address and preparing your access." : "Estamos a validar o endereço de email e a preparar o teu acesso."}</p>{error && <p className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2.5 text-sm text-red-200/90">{error}</p>}</div></main>;
}
