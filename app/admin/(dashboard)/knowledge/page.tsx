import FormSubmitButton from "@/app/_components/FormSubmitButton";
import {
  deleteKnowledgeEntry,
  reindexKnowledge,
  saveKnowledgeEntry,
} from "./actions";
import { getKnowledgeEntries } from "@/lib/admin/knowledge";

function badgeClasses(value: "published" | "draft" | "public" | "internal") {
  if (value === "published") return "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300/80";
  if (value === "public") return "border-sky-400/15 bg-sky-400/[0.06] text-sky-300/80";
  if (value === "internal") return "border-violet-400/15 bg-violet-400/[0.06] text-violet-300/80";
  return "border-amber-400/15 bg-amber-400/[0.06] text-amber-300/80";
}

export default async function KnowledgePage() {
  const entries = await getKnowledgeEntries();
  const published = entries.filter(
    (entry) => entry.status === "published" && entry.visibility === "public",
  );
  const drafts = entries.filter((entry) => entry.status === "draft");
  const missingEmbeddings = published.filter((entry) => !entry.embedding).length;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Cérebro comercial</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Conhecimento do Momo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Aqui defines os factos, FAQ e políticas que o Momo pode usar quando fala sobre o nosso serviço. Só conteúdo Público + Publicado é enviado ao Momo.
          </p>
        </div>

        <form action={reindexKnowledge}>
          <FormSubmitButton className="rounded-xl border border-[#ff7a18]/25 bg-[#ff7a18]/[0.06] px-4 py-2.5 text-sm text-[#ff9a4d] transition hover:bg-[#ff7a18]/[0.11]">
            Reindexar conhecimento
          </FormSubmitButton>
        </form>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-4">
          <p className="text-xs text-white/35">Entradas</p>
          <p className="mt-2 text-2xl font-semibold">{entries.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-4">
          <p className="text-xs text-white/35">Publicadas ao Momo</p>
          <p className="mt-2 text-2xl font-semibold">{published.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-4">
          <p className="text-xs text-white/35">Políticas por definir</p>
          <p className="mt-2 text-2xl font-semibold">{drafts.length}</p>
        </div>
      </section>

      {missingEmbeddings > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] px-5 py-4 text-sm leading-6 text-amber-100/70">
          Existem {missingEmbeddings} entradas públicas ainda sem índice semântico. Clica em “Reindexar conhecimento” uma vez depois de executar o SQL desta versão.
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-white/[0.07] bg-[#151515] p-5 sm:p-6">
        <h2 className="text-base font-semibold">Adicionar informação</h2>
        <p className="mt-1 text-xs text-white/35">Para FAQ, políticas, limites do serviço ou qualquer facto que o Momo deva conhecer.</p>

        <form action={saveKnowledgeEntry} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-white/45">
              Título
              <input name="title" required maxLength={180} placeholder="Ex.: Política de cancelamento" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>
            <label className="grid gap-2 text-xs text-white/45">
              Categoria
              <input name="category" defaultValue="FAQ" maxLength={80} placeholder="FAQ, Pricing, Privacidade..." className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>
          </div>

          <label className="grid gap-2 text-xs text-white/45">
            Conteúdo
            <textarea name="content" required rows={6} placeholder="Escreve aqui a resposta oficial que o Momo deve usar como fonte de verdade." className="rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[#ff7a18]/45" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-white/45">
              Visibilidade
              <select name="visibility" defaultValue="public" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                <option value="public">Público — Momo pode usar</option>
                <option value="internal">Interno — só administração</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs text-white/45">
              Estado
              <select name="status" defaultValue="draft" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
              </select>
            </label>
          </div>

          <div>
            <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">Guardar entrada</FormSubmitButton>
          </div>
        </form>
      </section>

      <section className="mt-6 space-y-3">
        {entries.map((entry) => (
          <details key={entry.id} className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.015]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white/90">{entry.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${badgeClasses(entry.status)}`}>{entry.status === "published" ? "Publicado" : "Rascunho"}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${badgeClasses(entry.visibility)}`}>{entry.visibility === "public" ? "Público" : "Interno"}</span>
                </div>
                <p className="mt-1 text-xs text-white/30">{entry.category}{entry.embedding ? " · indexado" : entry.status === "published" && entry.visibility === "public" ? " · por indexar" : ""}</p>
              </div>
              <span className="text-xs text-white/30 group-open:rotate-180">⌄</span>
            </summary>

            <div className="border-t border-white/[0.06] p-5">
              <form action={saveKnowledgeEntry} className="grid gap-4">
                <input type="hidden" name="id" value={entry.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs text-white/45">Título<input name="title" defaultValue={entry.title} required className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none" /></label>
                  <label className="grid gap-2 text-xs text-white/45">Categoria<input name="category" defaultValue={entry.category} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none" /></label>
                </div>
                <label className="grid gap-2 text-xs text-white/45">Conteúdo<textarea name="content" defaultValue={entry.content} required rows={7} className="rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs text-white/45">Visibilidade<select name="visibility" defaultValue={entry.visibility} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white"><option value="public">Público — Momo pode usar</option><option value="internal">Interno — só administração</option></select></label>
                  <label className="grid gap-2 text-xs text-white/45">Estado<select name="status" defaultValue={entry.status} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515]">Guardar alterações</FormSubmitButton>
                </div>
              </form>
              <form action={deleteKnowledgeEntry} className="mt-3">
                <input type="hidden" name="id" value={entry.id} />
                <FormSubmitButton className="rounded-xl border border-red-400/15 px-4 py-2.5 text-xs text-red-300/65 transition hover:bg-red-400/[0.05] hover:text-red-200">Apagar entrada</FormSubmitButton>
              </form>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
