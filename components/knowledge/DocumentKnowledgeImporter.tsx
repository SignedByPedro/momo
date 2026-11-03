"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, type DocumentKnowledgeDraft } from "@/lib/knowledge/document-import-shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AnalysisResult = {
  batchId: string;
  filename: string;
  summary: string;
  entries: DocumentKnowledgeDraft[];
};

type Props = {
  organizationId: string;
  language?: "pt" | "en";
};

function text(language: "pt" | "en", pt: string, en: string) {
  return language === "en" ? en : pt;
}

export default function DocumentKnowledgeImporter({ organizationId, language = "pt" }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [entries, setEntries] = useState<(DocumentKnowledgeDraft & { selected: boolean })[]>([]);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedCount = useMemo(() => entries.filter((entry) => entry.selected).length, [entries]);

  async function analyze() {
    if (!file || busy) return;
    if (file.size > DOCUMENT_MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      setError(
        text(
          language,
          `O ficheiro tem ${mb} MB. O limite atual é 25 MB.`,
          `The file is ${mb} MB. The current limit is 25 MB.`,
        ),
      );
      return;
    }

    setBusy("analyze");
    setError("");
    setNotice("");
    try {
      const prepareResponse = await fetch("/api/knowledge/document-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare-upload",
          organizationId,
          filename: file.name,
          fileSize: file.size,
          contentType: file.type,
        }),
      });
      const preparePayload = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) {
        throw new Error(
          typeof preparePayload.error === "string"
            ? preparePayload.error
            : text(language, "Não foi possível preparar o upload.", "Could not prepare the upload."),
        );
      }

      const bucket = typeof preparePayload.bucket === "string" ? preparePayload.bucket : "";
      const storagePath = typeof preparePayload.storagePath === "string" ? preparePayload.storagePath : "";
      const token = typeof preparePayload.token === "string" ? preparePayload.token : "";
      if (!bucket || !storagePath || !token) {
        throw new Error(text(language, "Upload temporário inválido.", "Invalid temporary upload."));
      }

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(storagePath, token, file, {
          contentType: file.type || undefined,
        });
      if (uploadError) throw new Error(uploadError.message || text(language, "Não foi possível enviar o ficheiro.", "Could not upload the file."));

      const response = await fetch("/api/knowledge/document-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-uploaded",
          organizationId,
          filename: file.name,
          contentType: file.type,
          storagePath,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : text(language, "Não foi possível analisar o documento.", "Could not analyze the document."),
        );
      }

      const result = payload as AnalysisResult;
      setAnalysis(result);
      setEntries((result.entries ?? []).map((entry) => ({ ...entry, selected: true })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text(language, "Não foi possível analisar o documento.", "Could not analyze the document."));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!analysis || busy) return;
    const selected = entries.filter((entry) => entry.selected).map((entry) => ({ title: entry.title, category: entry.category, content: entry.content }));
    if (!selected.length) {
      setError(text(language, "Seleciona pelo menos uma entrada.", "Select at least one entry."));
      return;
    }
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/knowledge/document-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          batchId: analysis.batchId,
          filename: analysis.filename,
          entries: selected,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : text(language, "Não foi possível guardar a Knowledge.", "Could not save the Knowledge."));
      const saved = Number(payload.saved ?? selected.length);
      setNotice(text(language, `${saved} entradas adicionadas e indexadas.`, `${saved} entries added and indexed.`));
      setAnalysis(null);
      setEntries([]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text(language, "Não foi possível guardar a Knowledge.", "Could not save the Knowledge."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">{text(language, "Documento", "Document")}</p>
          <h2 className="mt-1 text-lg font-semibold">{text(language, "Importar conhecimento de um ficheiro", "Import knowledge from a file")}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/35">
            {text(
              language,
              "Carrega Word, Excel, CSV, PDF, PowerPoint ou texto. O ficheiro é enviado diretamente para armazenamento temporário, analisado e removido; o Momo separa a informação em várias entradas de Knowledge para reveres antes de guardar.",
              "Upload Word, Excel, CSV, PDF, PowerPoint or text. The file is sent directly to temporary storage, analyzed and removed; Momo separates the information into multiple Knowledge entries for review before saving.",
            )}
          </p>
        </div>
        <span className="rounded-full border border-white/[0.07] px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-white/30">{text(language, "Máx. 25 MB", "Max. 25 MB")}</span>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-2 text-xs text-white/45">
          {text(language, "Ficheiro", "File")}
          <input
            ref={inputRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setAnalysis(null);
              setEntries([]);
              setError("");
              setNotice("");
            }}
            className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-2 text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.07] file:px-3 file:py-1.5 file:text-xs file:text-white/70"
          />
        </label>
        <button
          type="button"
          disabled={!file || Boolean(busy)}
          onClick={analyze}
          className="min-h-11 rounded-xl border border-[#ff7a18]/25 bg-[#ff7a18]/[0.06] px-5 text-sm font-medium text-[#ff9a4d] transition hover:bg-[#ff7a18]/[0.11] disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy === "analyze" ? text(language, "A carregar e analisar…", "Uploading and analyzing…") : text(language, "Analisar documento", "Analyze document")}
        </button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-300/15 bg-red-300/[0.04] px-4 py-3 text-sm text-red-100/75">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] px-4 py-3 text-sm text-emerald-100/80">{notice}</div>}

      {analysis && entries.length > 0 && (
        <div className="mt-6 border-t border-white/[0.07] pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white/85">{analysis.filename}</p>
              {analysis.summary && <p className="mt-1 max-w-3xl text-xs leading-5 text-white/40">{analysis.summary}</p>}
            </div>
            <p className="text-xs text-white/35">{selectedCount}/{entries.length} {text(language, "selecionadas", "selected")}</p>
          </div>

          <div className="mt-4 space-y-3">
            {entries.map((entry, index) => (
              <div key={`${analysis.batchId}-${index}`} className={`rounded-2xl border p-4 ${entry.selected ? "border-[#ff7a18]/20 bg-[#ff7a18]/[0.025]" : "border-white/[0.06] bg-[#101010] opacity-55"}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={entry.selected}
                    onChange={(event) => setEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))}
                    className="mt-3 size-4 accent-[#ff7a18]"
                    aria-label={text(language, "Selecionar entrada", "Select entry")}
                  />
                  <div className="grid min-w-0 flex-1 gap-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                      <input
                        value={entry.title}
                        disabled={!entry.selected}
                        onChange={(event) => setEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}
                        className="min-h-10 rounded-xl border border-white/[0.08] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/40 disabled:opacity-60"
                      />
                      <input
                        value={entry.category}
                        disabled={!entry.selected}
                        onChange={(event) => setEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, category: event.target.value } : item))}
                        className="min-h-10 rounded-xl border border-white/[0.08] bg-[#0d0d0d] px-3 text-sm text-white/70 outline-none focus:border-[#ff7a18]/40 disabled:opacity-60"
                      />
                    </div>
                    <textarea
                      value={entry.content}
                      disabled={!entry.selected}
                      rows={4}
                      onChange={(event) => setEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, content: event.target.value } : item))}
                      className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] px-3 py-2.5 text-sm leading-6 text-white/80 outline-none focus:border-[#ff7a18]/40 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedCount || Boolean(busy)}
              onClick={save}
              className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {busy === "save"
                ? text(language, "A guardar…", "Saving…")
                : text(language, `Adicionar ${selectedCount} à Knowledge`, `Add ${selectedCount} to Knowledge`)}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => {
                setAnalysis(null);
                setEntries([]);
              }}
              className="rounded-xl border border-white/[0.08] px-4 py-3 text-sm text-white/55 transition hover:text-white"
            >
              {text(language, "Cancelar análise", "Cancel analysis")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
