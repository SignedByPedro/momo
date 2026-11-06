"use client";

import FormSubmitButton from "@/app/_components/FormSubmitButton";
import { deleteClientKnowledgeEntry, saveClientKnowledgeEntry } from "@/app/admin/(dashboard)/clients/[id]/knowledge/actions";
import type { ClientKnowledgeEntry } from "@/lib/admin/client-knowledge";
import { tr, type UiLanguage } from "@/lib/i18n/ui";
import { useEffect, useMemo, useRef, useState } from "react";

export type PortalKnowledgeListEntry = Omit<ClientKnowledgeEntry, "embedding" | "organization_id" | "slug" | "created_at" | "updated_at"> & {
  indexed: boolean;
};

type Props = {
  organizationId: string;
  language: UiLanguage;
  entries: PortalKnowledgeListEntry[];
};

function statusBadge(entry: PortalKnowledgeListEntry) {
  if (entry.status === "draft") return "border-amber-300/15 bg-amber-300/[0.05] text-amber-200/70";
  if (entry.visibility === "internal") return "border-sky-300/15 bg-sky-300/[0.05] text-sky-200/70";
  return "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200/70";
}

function matchesQuery(entry: PortalKnowledgeListEntry, query: string) {
  const needle = query.trim().toLocaleLowerCase("pt");
  if (!needle) return true;
  const haystack = [entry.title, entry.category, entry.content, entry.source_url ?? "", entry.source_type, entry.status, entry.visibility]
    .join("\n")
    .toLocaleLowerCase("pt");
  return haystack.includes(needle);
}

export default function PortalKnowledgeEntries({ organizationId, language: l, entries }: Props) {
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PortalKnowledgeListEntry | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filtered = useMemo(() => entries.filter((entry) => matchesQuery(entry, query)), [entries, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pendingDelete) {
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (dialog.open) dialog.close();
  }, [pendingDelete]);

  const statusLabel = (entry: PortalKnowledgeListEntry) =>
    entry.status === "draft"
      ? tr(l, "Rascunho", "Draft")
      : entry.visibility === "internal"
        ? tr(l, "Interno", "Internal")
        : tr(l, "Publicado", "Published");

  return (
    <section className="mt-6 space-y-3">
      {entries.length > 0 && (
        <label className="block">
          <span className="sr-only">{tr(l, "Pesquisar entradas", "Search entries")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(l, "Pesquisar por título, categoria ou conteúdo…", "Search by title, category or content…")}
            className="min-h-11 w-full rounded-2xl border border-white/[0.08] bg-[#151515] px-4 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#ff7a18]/45"
          />
        </label>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] px-5 py-12 text-center text-sm text-white/35">
          {tr(
            l,
            "Ainda não existe conhecimento para esta empresa. Analisa o website ou adiciona a primeira entrada manualmente.",
            "There is no knowledge for this company yet. Analyze the website or add the first entry manually.",
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#151515] px-5 py-12 text-center text-sm text-white/35">
          {tr(l, "Nenhuma entrada corresponde à pesquisa.", "No entries match this search.")}
        </div>
      ) : (
        filtered.map((entry) => (
          <details key={entry.id} className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.015]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white/90">{entry.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${statusBadge(entry)}`}>
                    {statusLabel(entry)}
                  </span>
                  <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-white/35">
                    {entry.source_type === "website" ? "Website" : tr(l, "Manual", "Manual")}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-white/30">
                  {entry.category}
                  {entry.indexed
                    ? tr(l, " · indexado", " · indexed")
                    : entry.status === "published" && entry.visibility === "public"
                      ? tr(l, " · por indexar", " · awaiting indexing")
                      : ""}
                  {entry.source_url ? ` · ${entry.source_url}` : ""}
                </p>
              </div>
              <span className="text-xs text-white/30 group-open:rotate-180">⌄</span>
            </summary>
            <div className="border-t border-white/[0.06] p-5">
              <form action={saveClientKnowledgeEntry} className="grid gap-4">
                <input type="hidden" name="organizationId" value={organizationId} />
                <input type="hidden" name="id" value={entry.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs text-white/45">
                    {tr(l, "Título", "Title")}
                    <input name="title" defaultValue={entry.title} required className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none" />
                  </label>
                  <label className="grid gap-2 text-xs text-white/45">
                    {tr(l, "Categoria", "Category")}
                    <input name="category" defaultValue={entry.category} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none" />
                  </label>
                </div>
                <label className="grid gap-2 text-xs text-white/45">
                  {tr(l, "Conteúdo", "Content")}
                  <textarea name="content" defaultValue={entry.content} required rows={7} className="rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs text-white/45">
                    {tr(l, "Visibilidade", "Visibility")}
                    <select name="visibility" defaultValue={entry.visibility} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white">
                      <option value="public">{tr(l, "Público — agente pode usar", "Public — agent can use")}</option>
                      <option value="internal">{tr(l, "Interno — só administração", "Internal — admin only")}</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs text-white/45">
                    {tr(l, "Estado", "Status")}
                    <select name="status" defaultValue={entry.status} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white">
                      <option value="published">{tr(l, "Publicado", "Published")}</option>
                      <option value="draft">{tr(l, "Rascunho", "Draft")}</option>
                    </select>
                  </label>
                </div>
                {entry.source_url && (
                  <p className="break-all rounded-xl border border-white/[0.05] bg-[#101010] px-3 py-2 text-xs text-white/30">
                    {tr(l, "Fonte original", "Original source")}: {entry.source_url}
                  </p>
                )}
                <div>
                  <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-[#151515]">
                    {tr(l, "Guardar alterações", "Save changes")}
                  </FormSubmitButton>
                </div>
              </form>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setPendingDelete(entry)}
                  className="rounded-xl border border-red-400/15 px-4 py-2.5 text-xs text-red-300/65 transition hover:bg-red-400/[0.05] hover:text-red-200"
                >
                  {tr(l, "Apagar entrada", "Delete entry")}
                </button>
              </div>
            </div>
          </details>
        ))
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setPendingDelete(null)}
        className="fixed inset-0 m-auto w-[min(420px,calc(100vw-2rem))] rounded-3xl border border-white/[0.1] bg-[#151515] p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop:bg-black/70 open:flex open:flex-col"
      >
        {pendingDelete && (
          <div className="p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">{tr(l, "Confirmar", "Confirm")}</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">{tr(l, "Apagar esta entrada?", "Delete this entry?")}</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              {tr(
                l,
                "Esta ação não se pode desfazer. A entrada deixa de estar disponível para o agente.",
                "This cannot be undone. The entry will no longer be available to the agent.",
              )}
            </p>
            <p className="mt-4 rounded-2xl border border-white/[0.07] bg-[#101010] px-3.5 py-3 text-sm text-white/80">{pendingDelete.title}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-white/65 transition hover:border-white/20 hover:text-white"
              >
                {tr(l, "Cancelar", "Cancel")}
              </button>
              <form action={deleteClientKnowledgeEntry}>
                <input type="hidden" name="organizationId" value={organizationId} />
                <input type="hidden" name="id" value={pendingDelete.id} />
                <FormSubmitButton
                  className="rounded-xl border border-red-400/25 bg-red-400/[0.08] px-4 py-2.5 text-sm text-red-100 transition hover:bg-red-400/[0.14]"
                  pendingLabel={tr(l, "A apagar…", "Deleting…")}
                >
                  {tr(l, "Apagar", "Delete")}
                </FormSubmitButton>
              </form>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
