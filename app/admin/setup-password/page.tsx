import FormSubmitButton from "@/app/_components/FormSubmitButton";
import MomoIcon from "@/components/momo/MomoIcon";
import PasswordInput from "@/components/forms/PasswordInput";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUiLanguage, tr } from "@/lib/i18n/ui";
import { setAdminOwnerPassword } from "./actions";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminSetupPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; lang?: string }>;
}) {
  const query = await searchParams;
  const requestedLanguage = normalizeUiLanguage(query.lang);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user?.id || !user.email || !user.email_confirmed_at) {
    redirect(`/admin/login?lang=${requestedLanguage}`);
  }

  const admin = createSupabaseAdmin();
  const { data: adminAccess } = await admin
    .from("admin_users")
    .select("role, ui_language")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminAccess?.role !== "owner") {
    redirect(`/admin/login?lang=${requestedLanguage}`);
  }

  const l = normalizeUiLanguage(adminAccess.ui_language ?? requestedLanguage);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0d0d0d] px-5 text-white">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex justify-center"><MomoIcon size={52} /></div>
          <h1 className="text-2xl font-semibold tracking-tight">{tr(l, "Criar password de Owner", "Create Owner password")}</h1>
          <p className="mt-2 text-sm text-white/45">{tr(l, "Email confirmado", "Email confirmed")}: {user.email}</p>
        </div>

        <form action={setAdminOwnerPassword} className="rounded-3xl border border-white/[0.08] bg-[#151515] p-6 shadow-2xl">
          <input type="hidden" name="language" value={l} />
          <label className="block text-xs uppercase tracking-[0.14em] text-white/40">{tr(l, "Nova password", "New password")}</label>
          <PasswordInput
            name="password"
            wrapperClassName="mt-2"
            minLength={8}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3.5 py-3 text-sm outline-none focus:border-[#ff7a18]/60"
            showLabel={tr(l, "Mostrar password", "Show password")}
            hideLabel={tr(l, "Ocultar password", "Hide password")}
          />
          <label className="mt-5 block text-xs uppercase tracking-[0.14em] text-white/40">{tr(l, "Confirmar password", "Confirm password")}</label>
          <PasswordInput
            name="confirm"
            wrapperClassName="mt-2"
            minLength={8}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3.5 py-3 text-sm outline-none focus:border-[#ff7a18]/60"
            showLabel={tr(l, "Mostrar password", "Show password")}
            hideLabel={tr(l, "Ocultar password", "Hide password")}
          />
          {query.error && (
            <p className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2.5 text-sm text-red-200/90">
              {query.error}
            </p>
          )}
          <FormSubmitButton className="mt-6 w-full rounded-xl bg-[#ff7a18] px-4 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
            {tr(l, "Ativar acesso de Owner", "Activate Owner access")}
          </FormSubmitButton>
        </form>
      </div>
    </main>
  );
}
