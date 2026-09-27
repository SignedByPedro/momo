import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { createClient } from "../actions";

export default function NewClientPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/clients" className="text-sm text-white/40 transition hover:text-white">← Clientes</Link>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Nova organização</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Criar cliente</h1>
        <p className="mt-2 text-sm leading-6 text-white/40">
          Cria a organização base. Depois podes configurar a Knowledge Base, o agente, o widget e os acessos antes de ativar o cliente.
        </p>
      </div>

      <form action={createClient} className="mt-7 grid gap-5 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <label className="grid gap-2 text-xs text-white/45">
          Nome da empresa
          <input name="name" required maxLength={160} placeholder="Ex.: Fitness Factory" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
        </label>

        <label className="grid gap-2 text-xs text-white/45">
          Website
          <input name="website" inputMode="url" maxLength={500} placeholder="fitnessfactory.pt" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-xs text-white/45">
            Tipo de negócio
            <input name="businessType" maxLength={120} placeholder="Ex.: Ginásio" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
          </label>

          <label className="grid gap-2 text-xs text-white/45">
            País
            <input name="country" maxLength={120} placeholder="Ex.: Portugal" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
          </label>
        </div>

        <label className="grid gap-2 text-xs text-white/45">
          Idioma principal
          <select name="primaryLanguage" defaultValue="pt" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </label>

        <div className="rounded-2xl border border-white/[0.06] bg-[#101010] px-4 py-3 text-xs leading-5 text-white/35">
          O novo cliente começa no estado “Configuração”. Só o vamos marcar como “Ativo” quando o agente estiver pronto para utilização real.
        </div>

        <div>
          <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
            Criar cliente
          </FormSubmitButton>
        </div>
      </form>
    </div>
  );
}
