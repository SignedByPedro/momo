import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClientKnowledgeEntries,
  getClientKnowledgeStats,
  type ClientKnowledgeEntry,
} from "@/lib/admin/client-knowledge";
import { getOrganization } from "@/lib/admin/organizations";
import {
  analyzeClientWebsite,
  deleteClientKnowledgeEntry,
  reindexClientKnowledge,
  saveClientKnowledgeEntry,
} from "./actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

function statusBadge(entry: ClientKnowledgeEntry) {
  if (entry.status === "draft") return "border-amber-300/15 bg-amber-300/[0.05] text-amber-200/70";
  if (entry.visibility === "internal") return "border-sky-300/15 bg-sky-300/[0.05] text-sky-200/70";
  return "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200/70";
}

export default async function ClientKnowledgePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const client = await getOrganization(id);
  if (!client) notFound();

  const [entries, stats] = await Promise.all([
    getClientKnowledgeEntries(id),
    getClientKnowledgeStats(id),
  ]);

  return (
    <div className="max-w-6xl">
      <Link href={`/admin/clients/${id}`} className="text-sm text-white/40 transition hover:text-white">
        ← {client.name}
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Knowledge Base</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Informação exclusiva desta organização. O conhecimento do cliente fica separado do Momo comercial e dos restantes clientes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={reindexClientKnowledge}>
            <input type="hidden" name="organizationId" value={id} />
            <FormSubmitButton className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-white/65 transition hover:border-[#ff7a18]/30 hover:text-[#ff9a4d]">
              Reindexar
            </FormSubmitButton>
          </form>
          <form action={analyzeClientWebsite}>
            <input type="hidden" name="organizationId" value={id} />
            <FormSubmitButton
              disabled={!client.website}
              className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {stats.website ? "Analisar novamente" : "Analisar website"}
            </FormSubmitButton>
          </form>
        </div>
      </div>

      {notice && (
        <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] px-4 py-3 text-sm text-emerald-100/80">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-300/[0.04] px-4 py-3 text-sm text-red-100/80">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total", stats.total, "Entradas de conhecimento"],
          ["Website", stats.website, "Importadas automaticamente"],
          ["Publicadas", stats.published, "Disponíveis ao agente"],
          ["Indexadas", stats.indexed, "Prontas para pesquisa semântica"],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-white/30">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-white/30">{note}</p>
          </div>
        ))}
      </section>

      {!client.website && (
        <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-sm leading-6 text-amber-100/75">
          Este cliente ainda não tem website. Podes adicionar informação manualmente agora ou voltar aos dados do cliente para guardar um website.
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">Manual</p>
          <h2 className="mt-1 text-lg font-semibold">Adicionar conhecimento</h2>
          <p className="mt-1 text-xs leading-5 text-white/35">
            Usa isto para FAQ, políticas, regras, horários especiais ou informação que não esteja no website.
          </p>
        </div>

        <form action={saveClientKnowledgeEntry} className="mt-6 grid gap-4">
          <input type="hidden" name="organizationId" value={id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-white/45">
              Título
              <input name="title" required maxLength={180} placeholder="Ex.: Política de cancelamento" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>
            <label className="grid gap-2 text-xs text-white/45">
              Categoria
              <input name="category" defaultValue="FAQ" maxLength={80} placeholder="FAQ, Horários, Políticas..." className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>
          </div>

          <label className="grid gap-2 text-xs text-white/45">
            Conteúdo
            <textarea name="content" required rows={6} placeholder="Informação oficial que o agente deste cliente poderá usar." className="rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[#ff7a18]/45" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-white/45">
              Visibilidade
              <select name="visibility" defaultValue="public" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                <option value="public">Público — agente pode usar</option>
                <option value="internal">Interno — só administração</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs text-white/45">
              Estado
              <select name="status" defaultValue="published" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
              </select>
            </label>
          </div>

          <div>
            <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
              Guardar entrada
            </FormSubmitButton>
          </div>
        </form>
      </section>

      <section className="mt-6 space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] px-5 py-12 text-center text-sm text-white/35">
            Ainda não existe conhecimento para este cliente. Analisa o website ou adiciona a primeira entrada manualmente.
          </div>
        ) : (
          entries.map((entry) => (
            <details key={entry.id} className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.015]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white/90">{entry.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${statusBadge(entry)}`}>
                      {entry.status === "draft" ? "Rascunho" : entry.visibility === "internal" ? "Interno" : "Publicado"}
                    </span>
                    <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-white/35">
                      {entry.source_type === "website" ? "Website" : "Manual"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-white/30">
                    {entry.category}{entry.embedding ? " · indexado" : entry.status === "published" && entry.visibility === "public" ? " · por indexar" : ""}
                    {entry.source_url ? ` · ${entry.source_url}` : ""}
                  </p>
                </div>
                <span className="text-xs text-white/30 group-open:rotate-180">⌄</span>
              </summary>

              <div className="border-t border-white/[0.06] p-5">
                <form action={saveClientKnowledgeEntry} className="grid gap-4">
                  <input type="hidden" name="organizationId" value={id} />
                  <input type="hidden" name="id" value={entry.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-xs text-white/45">Título<input name="title" defaultValue={entry.title} required className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none" /></label>
                    <label className="grid gap-2 text-xs text-white/45">Categoria<input name="category" defaultValue={entry.category} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none" /></label>
                  </div>
                  <label className="grid gap-2 text-xs text-white/45">Conteúdo<textarea name="content" defaultValue={entry.content} required rows={7} className="rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none" /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-xs text-white/45">Visibilidade<select name="visibility" defaultValue={entry.visibility} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white"><option value="public">Público — agente pode usar</option><option value="internal">Interno — só administração</option></select></label>
                    <label className="grid gap-2 text-xs text-white/45">Estado<select name="status" defaultValue={entry.status} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white"><option value="published">Publicado</option><option value="draft">Rascunho</option></select></label>
                  </div>
                  {entry.source_url && (
                    <p className="break-all rounded-xl border border-white/[0.05] bg-[#101010] px-3 py-2 text-xs text-white/30">
                      Fonte original: {entry.source_url}
                    </p>
                  )}
                  <div>
                    <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515]">Guardar alterações</FormSubmitButton>
                  </div>
                </form>
                <form action={deleteClientKnowledgeEntry} className="mt-3">
                  <input type="hidden" name="organizationId" value={id} />
                  <input type="hidden" name="id" value={entry.id} />
                  <FormSubmitButton className="rounded-xl border border-red-400/15 px-4 py-2.5 text-xs text-red-300/65 transition hover:bg-red-400/[0.05] hover:text-red-200">Apagar entrada</FormSubmitButton>
                </form>
              </div>
            </details>
          ))
        )}
      </section>
    </div>
  );
}
