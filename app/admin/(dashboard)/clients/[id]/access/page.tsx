import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationMembers, getOrganizationMemberUsage } from "@/lib/admin/members";
import { getOrganization } from "@/lib/admin/organizations";
import { inviteOrganizationMember, resendOrganizationInvite, revokeOrganizationMember } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function ClientAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [organization, members, usage] = await Promise.all([
    getOrganization(id),
    getOrganizationMembers(id),
    getOrganizationMemberUsage(id),
  ]);
  if (!organization) notFound();

  return (
    <div className="max-w-5xl">
      <Link href={`/admin/clients/${id}`} className="text-sm text-white/40 transition hover:text-white">
        ← {organization.name}
      </Link>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Acessos</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Portal do cliente</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
          O acesso é apenas por convite. Cada pessoa tem de abrir o email recebido antes de conseguir usar o portal.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-white/55">
          <span className="font-medium text-white/80">{usage.used}/{usage.limit}</span> acessos em uso
          {usage.full && <span className="text-[#ff9a4d]">· limite atingido</span>}
        </div>
      </div>

      {query.notice && <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">{query.notice}</div>}
      {query.error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">{query.error}</div>}

      <section className="mt-7 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Convidar utilizador</h2>
        <p className="mt-1 text-xs leading-5 text-white/35">
          Owner pode alterar conhecimento, agente e widget. Member tem acesso operacional a conversas e leads.
        </p>

        <form action={inviteOrganizationMember} className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
          <input type="hidden" name="organizationId" value={id} />
          <label className="grid gap-2 text-xs text-white/45">
            Email
            <input name="email" type="email" required placeholder="cliente@empresa.pt" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ff7a18]/45" />
          </label>
          <label className="grid gap-2 text-xs text-white/45">
            Permissão
            <select name="role" defaultValue="client_owner" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
              <option value="client_owner">Client owner</option>
              <option value="client_member">Client member</option>
            </select>
          </label>
          <FormSubmitButton disabled={usage.full} className="min-h-11 rounded-xl bg-[#ff7a18] px-5 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138] disabled:cursor-not-allowed disabled:opacity-40">Enviar convite</FormSubmitButton>
        </form>
        {usage.full && <p className="mt-3 text-xs leading-5 text-[#ffb174]">Aumenta o limite de utilizadores nos dados do cliente para libertar novos convites.</p>}
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#151515]">
        <div className="border-b border-white/[0.07] px-6 py-4">
          <h2 className="text-sm font-semibold">Utilizadores com acesso</h2>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-white/35">Ainda não existem utilizadores convidados.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div>
                  <div className="font-medium text-white/85">{member.email}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/35">
                    <span>{member.role === "client_owner" ? "Owner" : "Member"}</span>
                    <span>·</span>
                    <span>{member.accepted_at ? `Email confirmado · ${formatDate(member.accepted_at)}` : `Convite enviado · ${formatDate(member.invited_at)}`}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!member.accepted_at && (
                    <form action={resendOrganizationInvite}>
                      <input type="hidden" name="organizationId" value={id} />
                      <input type="hidden" name="userId" value={member.user_id} />
                      <FormSubmitButton className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/55 transition hover:border-[#ff7a18]/25 hover:text-[#ff9a4d]">Reenviar convite</FormSubmitButton>
                    </form>
                  )}
                  <form action={revokeOrganizationMember}>
                    <input type="hidden" name="organizationId" value={id} />
                    <input type="hidden" name="userId" value={member.user_id} />
                    <FormSubmitButton className="rounded-xl border border-red-400/15 px-3 py-2 text-xs text-red-300/70 transition hover:bg-red-400/[0.06]">Remover acesso</FormSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
