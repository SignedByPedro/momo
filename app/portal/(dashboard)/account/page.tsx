import FormSubmitButton from "@/app/_components/FormSubmitButton";
import PasswordInput from "@/components/forms/PasswordInput";
import Link from "next/link";
import { getOrganizationMembers } from "@/lib/admin/members";
import { requirePortal } from "@/lib/portal/auth";
import { tr } from "@/lib/i18n/ui";
import { changeMyPortalPassword, deleteMyPortalAccount, requestLastOwnerAccountDeletion } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await requirePortal();
  const query = await searchParams;
  const l = session.language;
  const members = session.role === "client_owner"
    ? await getOrganizationMembers(session.organizationId)
    : [];
  const otherActiveOwner = members.some((member) =>
    member.role === "client_owner" &&
    member.user_id !== session.userId &&
    Boolean(member.accepted_at),
  );
  const soleOwner = session.role === "client_owner" && !otherActiveOwner;
  const confirmation = l === "en" ? "DELETE" : "ELIMINAR";

  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">
        {tr(l, "Conta pessoal", "Personal account")}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        {tr(l, "A minha conta", "My account")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/45">
        {tr(l, "Gere o teu acesso pessoal ao Portal do Momo, sem alterar os dados da empresa.", "Manage your personal access to the Momo Portal without changing company data.")}
      </p>
      {query.error && (
        <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/90">
          {query.error}
        </p>
      )}
      {query.notice && (
        <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100/90">
          {query.notice}
        </p>
      )}

      <section className="mt-7 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-lg font-semibold">{tr(l, "Dados de acesso", "Access details")}</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-white/35">Email</dt>
            <dd className="mt-1 break-words text-white/85">{session.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/35">{tr(l, "Permissão", "Role")}</dt>
            <dd className="mt-1 text-white/85">{session.role === "client_owner" ? "Owner" : "Member"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">{tr(l, "Alterar password", "Change password")}</h2>
        <p className="mt-3 text-sm leading-6 text-white/50">
          {tr(
            l,
            "Owners e Members podem alterar a password da própria conta. Por segurança, confirma primeiro a password atual.",
            "Owners and Members can change the password for their own account. For security, confirm your current password first.",
          )}
        </p>
        <form action={changeMyPortalPassword} className="mt-6 grid gap-4">
          <input type="hidden" name="uiLanguage" value={l} />
          <label className="grid gap-2 text-xs text-white/55">
            {tr(l, "Password atual", "Current password")}
            <PasswordInput name="currentPassword" autoComplete="current-password" required minLength={1} className="min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50" showLabel={tr(l, "Mostrar password", "Show password")} hideLabel={tr(l, "Ocultar password", "Hide password")} />
          </label>
          <label className="grid gap-2 text-xs text-white/55">
            {tr(l, "Nova password", "New password")}
            <PasswordInput name="newPassword" autoComplete="new-password" required minLength={8} className="min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50" showLabel={tr(l, "Mostrar password", "Show password")} hideLabel={tr(l, "Ocultar password", "Hide password")} />
          </label>
          <label className="grid gap-2 text-xs text-white/55">
            {tr(l, "Confirmar nova password", "Confirm new password")}
            <PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={8} className="min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50" showLabel={tr(l, "Mostrar password", "Show password")} hideLabel={tr(l, "Ocultar password", "Hide password")} />
          </label>
          <p className="text-xs leading-5 text-white/35">
            {tr(l, "A nova password deve ter pelo menos 8 caracteres.", "The new password must be at least 8 characters long.")}
          </p>
          <div>
            <FormSubmitButton
              pendingLabel={tr(l, "A alterar…", "Changing…")}
              className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]"
            >
              {tr(l, "Alterar password", "Change password")}
            </FormSubmitButton>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-red-400/15 bg-[#151515] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-red-200/90">
          {tr(l, "Eliminar a minha conta", "Delete my account")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/50">
          {tr(
            l,
            "Esta ação elimina permanentemente a tua conta de acesso ao Portal. Não elimina a empresa, o widget, as conversas nem os dados operacionais. Alguns registos históricos podem ser conservados de acordo com as obrigações aplicáveis.",
            "This permanently deletes your Portal login account. It does not delete the company, widget, conversations or operational data. Some historical records may be retained where required.",
          )}
        </p>

        {soleOwner ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
            <h3 className="font-semibold text-amber-100/85">
              {tr(l, "És o último Owner ativo", "You are the last active Owner")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/45">
              {tr(
                l,
                "Para não deixar a empresa sem responsável, precisamos de organizar uma transferência ou o encerramento da conta. Podes pedir-nos já a eliminação da tua conta pessoal.",
                "To avoid leaving the company without an administrator, we must arrange a transfer or account closure first. You can request deletion of your personal account now.",
              )}
            </p>
            <form action={requestLastOwnerAccountDeletion} className="mt-5 grid gap-4">
              <input type="hidden" name="uiLanguage" value={l} />
              <label className="grid gap-2 text-xs text-white/50">
                {tr(l, "Confirma com o email da tua conta", "Confirm with your account email")}
                <input name="confirmation" type="email" required autoComplete="off" className="min-h-11 rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-amber-300/40" />
              </label>
              <div>
                <FormSubmitButton className="rounded-xl border border-amber-300/25 px-5 py-3 text-sm font-medium text-amber-100/90 transition hover:bg-amber-300/[0.07]">
                  {tr(l, "Pedir eliminação à equipa Momo", "Request deletion from the Momo team")}
                </FormSubmitButton>
              </div>
            </form>
            <p className="mt-4 text-xs text-white/35">
              {tr(l, "A empresa pode adicionar outro Owner através da nossa equipa.", "Our team can add another Owner to the company.")}
            </p>
          </div>
        ) : (
          <form action={deleteMyPortalAccount} className="mt-6 grid gap-4">
            <input type="hidden" name="uiLanguage" value={l} />
            <label className="grid gap-2 text-xs text-white/55">
              {tr(l, "Password atual", "Current password")}
              <PasswordInput name="password" autoComplete="current-password" required minLength={1} className="min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-red-300/40" showLabel={tr(l, "Mostrar password", "Show password")} hideLabel={tr(l, "Ocultar password", "Hide password")} />
            </label>
            <label className="grid gap-2 text-xs text-white/55">
              {tr(l, `Para confirmar, escreve exatamente ${confirmation}`, `To confirm, type exactly ${confirmation}`)}
              <input name="confirmation" required autoComplete="off" className="min-h-11 rounded-xl border border-red-400/20 bg-[#101010] px-3 text-sm text-white outline-none focus:border-red-300/40" />
            </label>
            <p className="text-xs leading-5 text-white/35">
              {tr(l, "Esta ação é irreversível. Vais perder o acesso e precisar de um novo convite caso queiras voltar.", "This action cannot be undone. You will lose access and need a new invitation if you want to return.")}
            </p>
            <div>
              <FormSubmitButton className="rounded-xl border border-red-400/30 bg-red-400/[0.05] px-5 py-3 text-sm font-medium text-red-200 transition hover:bg-red-400/[0.10]">
                {tr(l, "Eliminar definitivamente a minha conta", "Permanently delete my account")}
              </FormSubmitButton>
            </div>
          </form>
        )}
        <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs leading-5 text-white/35">
          {tr(l, "Para exercer outros direitos de privacidade ou pedir a eliminação de dados, contacta o", "For other privacy rights or data erasure requests, contact")} {" "}
          <Link className="text-[#ff9a4d] underline underline-offset-4" href="/portal/support">{tr(l, "suporte", "support")}</Link>.
        </p>
      </section>
    </div>
  );
}
