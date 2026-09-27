import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { getOrganizationMemberUsage, getOrganizationMembers } from "@/lib/admin/members";
import { requirePortalOwner } from "@/lib/portal/auth";
import { dateLocale, tr } from "@/lib/i18n/ui";
import { invitePortalMember, removePortalMember, resendPortalMemberInvite } from "./actions";

export default async function PortalTeamPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const session = await requirePortalOwner();
  const query = await searchParams;
  const [members, usage] = await Promise.all([getOrganizationMembers(session.organizationId), getOrganizationMemberUsage(session.organizationId)]);
  const l = session.language;
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(dateLocale(l), { dateStyle: "medium" }).format(new Date(value)) : "—";

  return <div className="max-w-5xl">
    <div><p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">{tr(l,"Acessos","Access")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr(l,"Equipa","Team")}</h1><p className="mt-2 text-sm leading-6 text-white/40">{tr(l,"Convida colaboradores para acompanhar conversas e leads desta empresa.","Invite teammates to manage this company's conversations and leads.")}</p></div>
    {query.notice && <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">{query.notice}</div>}
    {query.error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">{query.error}</div>}

    <section className="mt-7 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{tr(l,"Convidar colaborador","Invite team member")}</h2><p className="mt-1 text-xs text-white/35">{tr(l,"Owners podem convidar apenas Members. Convites pendentes também contam para o limite.","Owners can invite Members only. Pending invitations also count towards the limit.")}</p></div><span className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-white/45">{usage.used}/{usage.limit} {tr(l,"acessos","seats")}</span></div>
      <form action={invitePortalMember} className="mt-5 flex flex-col gap-3 sm:flex-row"><input type="hidden" name="uiLanguage" value={l}/><input type="email" name="email" required placeholder="name@company.com" className="min-h-11 flex-1 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45"/><FormSubmitButton disabled={usage.full} className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138] disabled:cursor-not-allowed disabled:opacity-35">{tr(l,"Enviar convite","Send invite")}</FormSubmitButton></form>
      {usage.full && <p className="mt-3 text-xs leading-5 text-amber-200/65">{tr(l,"Atingiste o limite de colaboradores desta conta. Contacta-nos para aumentar o limite.","You've reached this account's team member limit. Contact us to increase it.")}</p>}
    </section>

    <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
      <div className="border-b border-white/[0.06] px-5 py-4"><h2 className="font-medium">{tr(l,"Utilizadores","Users")}</h2></div>
      {members.length === 0 ? <div className="px-5 py-12 text-center text-sm text-white/35">{tr(l,"Ainda não existem utilizadores.","There are no users yet.")}</div> : <div className="divide-y divide-white/[0.05]">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="text-sm font-medium text-white/80">{member.email}</p><p className="mt-1 text-xs text-white/30">{member.role === "client_owner" ? "Owner" : "Member"} · {member.accepted_at ? tr(l,"Ativo","Active") : tr(l,"Convite pendente","Pending invite")} · {tr(l,"Convidado em","Invited on")} {formatDate(member.invited_at)}</p></div><div className="flex gap-2">{!member.accepted_at && <form action={resendPortalMemberInvite}><input type="hidden" name="userId" value={member.user_id}/><input type="hidden" name="uiLanguage" value={l}/><FormSubmitButton className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/55 hover:text-white">{tr(l,"Reenviar","Resend")}</FormSubmitButton></form>}{member.role === "client_member" && <form action={removePortalMember}><input type="hidden" name="userId" value={member.user_id}/><input type="hidden" name="uiLanguage" value={l}/><FormSubmitButton className="rounded-lg border border-red-400/15 px-3 py-2 text-xs text-red-300/65 hover:text-red-200">{tr(l,"Remover","Remove")}</FormSubmitButton></form>}{member.role === "client_owner" && (member.user_id === session.userId ? <Link className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/55 hover:text-white" href="/portal/account">{tr(l,"A minha conta","My account")}</Link> : <Link className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/55 hover:text-white" href="/portal/support">{tr(l,"Pedir remoção ao Momo","Request removal via Momo")}</Link>)}</div></div>)}</div>}
    </section>
  </div>;
}
