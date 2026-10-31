import Link from "next/link";
import FormSubmitButton from "@/app/_components/FormSubmitButton";
import { requirePortal } from "@/lib/portal/auth";
import { supportCategoryLabel, type SupportTicketCategory } from "@/lib/support/tickets";
import { tr } from "@/lib/i18n/ui";
import { createManualSupportTicket } from "../actions";

const categories: SupportTicketCategory[] = [
  "general",
  "technical",
  "integration",
  "feature",
  "billing",
  "account",
  "privacy",
];

export default async function NewSupportTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePortal();
  const query = await searchParams;
  const l = session.language;

  return (
    <div className="max-w-3xl">
      <Link href="/portal/support" className="text-sm text-white/40 transition hover:text-white">
        ← {tr(l, "Support", "Support")}
      </Link>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Momo Support</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr(l, "Criar ticket", "Create ticket")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
          {tr(
            l,
            "Usa um ticket quando quiseres enviar um pedido diretamente para a equipa Momo. Para dúvidas rápidas sobre o Portal, podes continuar a usar o Momo Support no canto inferior direito.",
            "Use a ticket when you want to send a request directly to the Momo team. For quick Portal questions, you can keep using Momo Support in the bottom-right corner.",
          )}
        </p>
      </div>

      {query.error && (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">
          {query.error}
        </div>
      )}

      <form action={createManualSupportTicket} className="mt-7 grid gap-5 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <label className="grid gap-2 text-xs text-white/45">
          {tr(l, "Assunto", "Subject")}
          <input
            name="subject"
            required
            maxLength={180}
            placeholder={tr(l, "Ex.: Problema ao publicar o widget", "E.g. Problem publishing the widget")}
            className="min-h-12 rounded-xl border border-white/[0.08] bg-[#101010] px-3.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ff7a18]/45"
          />
        </label>

        <label className="grid gap-2 text-xs text-white/45">
          {tr(l, "Categoria", "Category")}
          <select name="category" defaultValue="general" className="min-h-12 rounded-xl border border-white/[0.08] bg-[#101010] px-3.5 text-sm text-white outline-none focus:border-[#ff7a18]/45">
            {categories.map((category) => (
              <option key={category} value={category}>{supportCategoryLabel(category, l)}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs text-white/45">
          {tr(l, "Mensagem", "Message")}
          <textarea
            name="message"
            required
            rows={8}
            maxLength={6000}
            placeholder={tr(l, "Explica o que precisas e inclui os detalhes relevantes.", "Explain what you need and include the relevant details.")}
            className="resize-y rounded-xl border border-white/[0.08] bg-[#101010] px-3.5 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-[#ff7a18]/45"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
          <p className="text-xs leading-5 text-white/30">
            {tr(l, "A equipa recebe este pedido e podes acompanhar as respostas na área Support.", "The team receives this request and you can follow replies in the Support area.")}
          </p>
          <FormSubmitButton
            pendingLabel={tr(l, "A criar…", "Creating…")}
            className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]"
          >
            {tr(l, "Criar ticket", "Create ticket")}
          </FormSubmitButton>
        </div>
      </form>
    </div>
  );
}
