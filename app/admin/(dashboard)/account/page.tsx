import FormSubmitButton from "@/app/_components/FormSubmitButton";
import { requireAdmin } from "@/lib/admin/auth";
import { dateLocale, tr } from "@/lib/i18n/ui";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { changeMyAdminPassword, inviteAdminOwner, updateAdminUiLanguage } from "./actions";

export const dynamic = "force-dynamic";

type OwnerAccess = {
  userId: string;
  email: string;
  invitedAt: string | null;
  emailConfirmedAt: string | null;
};

async function getOwners(): Promise<OwnerAccess[]> {
  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("admin_users")
    .select("user_id, email")
    .eq("role", "owner")
    .order("email", { ascending: true });

  if (error) {
    console.error("[admin-account] Could not load Owners:", error);
    return [];
  }

  return Promise.all(
    (rows ?? []).map(async (row) => {
      const { data } = await supabase.auth.admin.getUserById(row.user_id);
      return {
        userId: row.user_id,
        email: row.email ?? data.user?.email ?? "",
        invitedAt: data.user?.invited_at ?? data.user?.created_at ?? null,
        emailConfirmedAt: data.user?.email_confirmed_at ?? null,
      };
    }),
  );
}

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const l = admin.language;
  const owners = admin.role === "owner" ? await getOwners() : [];
  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(dateLocale(l), { dateStyle: "medium" }).format(new Date(value))
      : tr(l, "Data indisponível", "Date unavailable");

  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">
        {tr(l, "Conta pessoal", "Personal account")}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        {tr(l, "A minha conta", "My account")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/45">
        {tr(l, "Gere o teu acesso pessoal ao Admin do Momo.", "Manage your personal access to Momo Admin.")}
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
            <dd className="mt-1 break-words text-white/85">{admin.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/35">{tr(l, "Permissão", "Role")}</dt>
            <dd className="mt-1 text-white/85">{admin.role === "owner" ? "Owner" : "Admin"}</dd>
          </div>
        </dl>
      </section>

      {admin.role === "owner" && (
        <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#ff8a32]">Admin access</p>
            <h2 className="mt-1 text-xl font-semibold">{tr(l, "Owners do Momo", "Momo Owners")}</h2>
            <p className="mt-3 text-sm leading-6 text-white/50">
              {tr(
                l,
                "Convida outro Owner para ter acesso total ao Momo Admin. O convite é enviado por email e só fica utilizável depois da confirmação.",
                "Invite another Owner to have full access to Momo Admin. The invite is sent by email and only becomes usable after confirmation.",
              )}
            </p>
          </div>

          <form action={inviteAdminOwner} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="uiLanguage" value={l} />
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="owner@example.com"
              className="min-h-11 flex-1 rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50"
            />
            <FormSubmitButton
              pendingLabel={tr(l, "A enviar…", "Sending…")}
              className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]"
            >
              {tr(l, "Convidar Owner", "Invite Owner")}
            </FormSubmitButton>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
            {owners.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/35">
                {tr(l, "Não foi possível carregar os Owners.", "Could not load Owners.")}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {owners.map((owner) => {
                  const current = owner.userId === admin.userId;
                  const active = Boolean(owner.emailConfirmedAt);
                  return (
                    <div key={owner.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-white/85">
                          {owner.email}
                          {current && <span className="ml-2 text-xs font-normal text-white/35">{tr(l, "(tu)", "(you)")}</span>}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          Owner · {active ? tr(l, "Ativo", "Active") : tr(l, "Convite pendente", "Pending invite")} · {formatDate(owner.invitedAt)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${active ? "border-emerald-300/15 text-emerald-200/70" : "border-amber-300/15 text-amber-200/70"}`}>
                        {active ? tr(l, "Email confirmado", "Email confirmed") : tr(l, "A aguardar confirmação", "Awaiting confirmation")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">{tr(l, "Idioma da interface", "Interface language")}</h2>
        <p className="mt-3 text-sm leading-6 text-white/50">
          {tr(
            l,
            "Escolhe o idioma usado na navegação e nas áreas do Admin que já suportam PT/EN. A preferência fica associada à tua conta.",
            "Choose the language used in navigation and Admin areas that already support PT/EN. The preference is saved to your account.",
          )}
        </p>
        <form action={updateAdminUiLanguage} className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-2 text-xs text-white/55">
            {tr(l, "Idioma", "Language")}
            <select
              name="language"
              defaultValue={l}
              className="min-h-11 rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50"
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
            </select>
          </label>
          <FormSubmitButton
            pendingLabel={tr(l, "A guardar…", "Saving…")}
            className="min-h-11 rounded-xl border border-white/[0.1] px-5 text-sm font-medium text-white/75 transition hover:bg-white/[0.05] hover:text-white"
          >
            {tr(l, "Guardar idioma", "Save language")}
          </FormSubmitButton>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">{tr(l, "Alterar password", "Change password")}</h2>
        <p className="mt-3 text-sm leading-6 text-white/50">
          {tr(l, "Confirma a password atual antes de escolher uma nova.", "Confirm your current password before choosing a new one.")}
        </p>
        <form action={changeMyAdminPassword} className="mt-6 grid gap-4">
          <input type="hidden" name="uiLanguage" value={l} />
          <label className="grid gap-2 text-xs text-white/55">
            {tr(l, "Password atual", "Current password")}
            <input name="currentPassword" type="password" autoComplete="current-password" required minLength={1} className="min-h-11 rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50" />
          </label>
          <label className="grid gap-2 text-xs text-white/55">
            {tr(l, "Nova password", "New password")}
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} className="min-h-11 rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50" />
          </label>
          <label className="grid gap-2 text-xs text-white/55">
            {tr(l, "Confirmar nova password", "Confirm new password")}
            <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="min-h-11 rounded-xl border border-white/[0.1] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff8a32]/50" />
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
    </div>
  );
}
