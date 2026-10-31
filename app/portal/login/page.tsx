import FormSubmitButton from "@/app/_components/FormSubmitButton";
import PasswordInput from "@/components/forms/PasswordInput";
import Link from "next/link";
import { redirect } from "next/navigation";
import MomoIcon from "@/components/momo/MomoIcon";
import SubmitLoginOnEnter from "@/app/_components/SubmitLoginOnEnter";
import { getPortalSession } from "@/lib/portal/auth";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";
import { portalLogin } from "./actions";
import PublicLegalFooter from "../../legal/_components/PublicLegalFooter";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; lang?: string; deleted?: string }> }) {
  const session = await getPortalSession();
  if (session) redirect("/portal");
  const query = await searchParams;
  const l = normalizeUiLanguage(query.lang);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0d0d0d] px-5 text-white">
      <div className="w-full max-w-[410px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center"><MomoIcon size={56} /></div>
          <h1 className="text-2xl font-semibold tracking-tight">{tr(l,"Portal do cliente","Client portal")}</h1>
          <p className="mt-2 text-sm text-white/45">{tr(l,"Gere o teu agente, conversas e conhecimento.","Manage your agent, conversations and knowledge.")}</p>
          <div className="mt-4 flex justify-center gap-1 text-xs"><Link href="/portal/login?lang=pt" className={`rounded-lg px-2 py-1 ${l === "pt" ? "bg-white/[0.08] text-white" : "text-white/35"}`}>PT</Link><Link href="/portal/login?lang=en" className={`rounded-lg px-2 py-1 ${l === "en" ? "bg-white/[0.08] text-white" : "text-white/35"}`}>EN</Link></div>
        </div>
        <form action={portalLogin} className="rounded-3xl border border-white/[0.08] bg-[#151515] p-6 shadow-2xl">
          <SubmitLoginOnEnter>
          <input type="hidden" name="language" value={l}/>
          <label className="block text-xs font-medium uppercase tracking-[0.14em] text-white/40">Email</label>
          <input name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3.5 py-3 text-sm outline-none transition focus:border-[#ff7a18]/60" placeholder="name@company.com" />
          <label className="mt-5 block text-xs font-medium uppercase tracking-[0.14em] text-white/40">{tr(l,"Password","Password")}</label>
          <PasswordInput name="password" wrapperClassName="mt-2" autoComplete="current-password" required className="w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3.5 py-3 text-sm outline-none transition focus:border-[#ff7a18]/60" placeholder="••••••••" showLabel={tr(l,"Mostrar password","Show password")} hideLabel={tr(l,"Ocultar password","Hide password")} />
          {query.deleted === "1" && <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5 text-sm text-emerald-200/90">{tr(l, "A tua conta foi eliminada. Deixaste de ter acesso ao Portal.", "Your account has been deleted. Your Portal access has ended.")}</p>}
          {query.error && <p className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2.5 text-sm text-red-200/90">{query.error}</p>}
          <FormSubmitButton pendingLabel={tr(l,"A entrar…","Signing in…")} type="submit" className="mt-6 w-full rounded-xl bg-[#ff7a18] px-4 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">{tr(l,"Entrar","Sign in")}</FormSubmitButton>
          </SubmitLoginOnEnter>
        </form>
        <p className="mt-4 text-center text-xs leading-5 text-white/25">{tr(l,"Não existe registo público. O acesso é criado apenas através de convite da equipa.","There is no public sign-up. Access is created by invitation only.")}</p>
      </div>
      <PublicLegalFooter language={l} />
    </main>
  );
}
