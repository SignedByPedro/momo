import FormSubmitButton from "@/app/_components/FormSubmitButton";
import ClientAgentTester from "@/components/testing/ClientAgentTester";
import DocumentKnowledgeImporter from "@/components/knowledge/DocumentKnowledgeImporter";
import Link from "next/link";
import { getClientKnowledgeEntries, getClientKnowledgeStats } from "@/lib/admin/client-knowledge";
import { getOrganization } from "@/lib/admin/organizations";
import { portalHasPremiumAccess, requirePortalOwner } from "@/lib/portal/auth";
import { tr } from "@/lib/i18n/ui";
import { analyzeClientWebsite, reindexClientKnowledge, saveClientKnowledgeEntry } from "@/app/admin/(dashboard)/clients/[id]/knowledge/actions";
import PortalKnowledgeEntries from "./PortalKnowledgeEntries";

type Props = { searchParams: Promise<{ notice?: string; error?: string }> };

export default async function ClientKnowledgePage({ searchParams }: Props) {
  const session = await requirePortalOwner();
  const id = session.organizationId;
  const l = session.language;
  const { notice, error } = await searchParams;
  const client = await getOrganization(id);
  if (!client) return null;
  const [entries, stats] = await Promise.all([getClientKnowledgeEntries(id), getClientKnowledgeStats(id)]);
  const listEntries = entries.map(({ embedding, organization_id: _organizationId, slug: _slug, created_at: _createdAt, updated_at: _updatedAt, ...entry }) => ({
    ...entry,
    indexed: Boolean(embedding),
  }));

  return (
    <div className="max-w-6xl">
      <Link href="/portal" className="text-sm text-white/40 transition hover:text-white">
        ← Dashboard
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Knowledge Base</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            {tr(
              l,
              "Informação exclusiva desta organização. O conhecimento do cliente fica separado do Momo comercial e dos restantes clientes.",
              "Information exclusive to this organization. Your knowledge stays separate from Momo's sales knowledge and from other clients.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="#tester" className="rounded-xl border border-[#ff7a18]/25 bg-[#ff7a18]/[0.05] px-4 py-2.5 text-sm text-[#ff9a4d] transition hover:bg-[#ff7a18]/[0.1]">
            {tr(l, "Testar agente", "Test agent")}
          </a>
          <form action={reindexClientKnowledge}>
            <input type="hidden" name="organizationId" value={id} />
            <FormSubmitButton className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-white/65 transition hover:border-[#ff7a18]/30 hover:text-[#ff9a4d]">
              {tr(l, "Reindexar", "Reindex")}
            </FormSubmitButton>
          </form>
          <form action={analyzeClientWebsite}>
            <input type="hidden" name="organizationId" value={id} />
            <FormSubmitButton disabled={!client.website} className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138] disabled:cursor-not-allowed disabled:opacity-35">
              {stats.website ? tr(l, "Analisar novamente", "Analyze again") : tr(l, "Analisar website", "Analyze website")}
            </FormSubmitButton>
          </form>
        </div>
      </div>
      {notice && <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] px-4 py-3 text-sm text-emerald-100/80">{notice}</div>}
      {error && <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-300/[0.04] px-4 py-3 text-sm text-red-100/80">{error}</div>}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total", stats.total, tr(l, "Entradas de conhecimento", "Knowledge entries")],
          ["Website", stats.website, tr(l, "Importadas automaticamente", "Imported automatically")],
          [tr(l, "Publicadas", "Published"), stats.published, tr(l, "Disponíveis ao agente", "Available to the agent")],
          [tr(l, "Indexadas", "Indexed"), stats.indexed, tr(l, "Prontas para pesquisa semântica", "Ready for semantic search")],
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
          {tr(
            l,
            "Esta empresa ainda não tem website. Podes adicionar informação manualmente agora ou voltar aos dados da empresa para guardar um website.",
            "This company does not have a website yet. You can add information manually now or go back to Company to add a website.",
          )}
        </div>
      )}
      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">{tr(l, "Manual", "Manual")}</p>
          <h2 className="mt-1 text-lg font-semibold">{tr(l, "Adicionar conhecimento", "Add knowledge")}</h2>
          <p className="mt-1 text-xs leading-5 text-white/35">
            {tr(
              l,
              "Usa isto para FAQ, políticas, regras, horários especiais ou informação que não esteja no website.",
              "Use this for FAQs, policies, rules, special opening hours or information that is not on the website.",
            )}
          </p>
        </div>
        <form action={saveClientKnowledgeEntry} className="mt-6 grid gap-4">
          <input type="hidden" name="organizationId" value={id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-white/45">
              {tr(l, "Título", "Title")}
              <input name="title" required maxLength={180} placeholder={tr(l, "Ex.: Política de cancelamento", "E.g. Cancellation policy")} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>
            <label className="grid gap-2 text-xs text-white/45">
              {tr(l, "Categoria", "Category")}
              <input name="category" defaultValue="FAQ" maxLength={80} placeholder={tr(l, "FAQ, Horários, Políticas...", "FAQ, Hours, Policies...")} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" />
            </label>
          </div>
          <label className="grid gap-2 text-xs text-white/45">
            {tr(l, "Conteúdo", "Content")}
            <textarea name="content" required rows={6} placeholder={tr(l, "Informação oficial que o agente poderá usar.", "Official information the agent can use.")} className="rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[#ff7a18]/45" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-white/45">
              {tr(l, "Visibilidade", "Visibility")}
              <select name="visibility" defaultValue="public" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                <option value="public">{tr(l, "Público — agente pode usar", "Public — agent can use")}</option>
                <option value="internal">{tr(l, "Interno — só administração", "Internal — admin only")}</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs text-white/45">
              {tr(l, "Estado", "Status")}
              <select name="status" defaultValue="published" className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
                <option value="published">{tr(l, "Publicado", "Published")}</option>
                <option value="draft">{tr(l, "Rascunho", "Draft")}</option>
              </select>
            </label>
          </div>
          <div>
            <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
              {tr(l, "Guardar entrada", "Save entry")}
            </FormSubmitButton>
          </div>
        </form>
      </section>
      <PortalKnowledgeEntries organizationId={id} language={l} entries={listEntries} />
      <div className="mt-10 border-t border-white/[0.07] pt-8">
        <ClientAgentTester fixedClientId={id} surface="portal" embedded />
      </div>
    </div>
  );
}
