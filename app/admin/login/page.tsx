import FormSubmitButton from "@/app/_components/FormSubmitButton";
import { redirect } from "next/navigation";
import MomoIcon from "@/components/momo/MomoIcon";
import SubmitLoginOnEnter from "@/app/_components/SubmitLoginOnEnter";
import { getAdminSession } from "@/lib/admin/auth";
import { login } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#0d0d0d] px-5 text-white">
      <div className="w-full max-w-[410px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center"><MomoIcon size={56} /></div>
          <h1 className="text-2xl font-semibold tracking-tight">Momo Admin</h1>
          <p className="mt-2 text-sm text-white/45">Leads e conversas num só lugar.</p>
        </div>

        <form action={login} className="rounded-3xl border border-white/[0.08] bg-[#151515] p-6 shadow-2xl">
          <SubmitLoginOnEnter>
          <label className="block text-xs font-medium uppercase tracking-[0.14em] text-white/40">
            Email
          </label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3.5 py-3 text-sm outline-none transition focus:border-[#ff7a18]/60"
            placeholder="pedro@exemplo.com"
          />

          <label className="mt-5 block text-xs font-medium uppercase tracking-[0.14em] text-white/40">
            Password
          </label>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3.5 py-3 text-sm outline-none transition focus:border-[#ff7a18]/60"
            placeholder="••••••••"
          />

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2.5 text-sm text-red-200/90">
              {error}
            </p>
          )}

          <FormSubmitButton
            pendingLabel="A entrar…"
            type="submit"
            className="mt-6 w-full rounded-xl bg-[#ff7a18] px-4 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]"
          >
            Entrar
          </FormSubmitButton>
          </SubmitLoginOnEnter>
        </form>
      </div>
    </main>
  );
}
