"use client";

import { useEffect, useMemo, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
  status: string;
};

type KnowledgeOption = {
  id: string;
  title: string;
  category: string;
  sourceType: "manual" | "website";
  indexed: boolean;
};

type TesterMeta = {
  organization: { id: string; name: string; primaryLanguage: string; status: string };
  entries: KnowledgeOption[];
};

type TestStatus = "pass" | "warning" | "fail";
type TestKind = "knowledge" | "edge" | "unknown" | "context";

type TesterCase = {
  question: string;
  entryIds: string[];
  goal: string;
  kind: Exclude<TestKind, "context">;
  answer: string;
  retrievedEntryIds: string[];
  status: TestStatus;
  score: number;
  reason: string;
  expected: string;
};

type TesterConversationTurn = {
  question: string;
  entryIds: string[];
  goal: string;
  kind: TestKind;
  answer: string;
  retrievedEntryIds: string[];
  status: TestStatus;
  score: number;
  reason: string;
  expected: string;
};

type TesterConversation = {
  title: string;
  goal: string;
  status: TestStatus;
  score: number;
  reason: string;
  turns: TesterConversationTurn[];
};

type TesterResult = {
  organization: { id: string; name: string };
  scope: {
    selectedCount: number;
    allKnowledge: boolean;
    questionCount: number;
    standaloneCount: number;
    conversationCount: number;
    conversationTurns: number;
  };
  stats: { pass: number; warning: number; fail: number };
  cases: TesterCase[];
  conversations: TesterConversation[];
  report: {
    score: number;
    verdict: "excellent" | "good" | "needs_attention" | "poor";
    summary: string;
    strengths: string[];
    issues: string[];
    recommendations: string[];
  };
};

function verdictLabel(value: TesterResult["report"]["verdict"]) {
  if (value === "excellent") return "Excelente";
  if (value === "good") return "Bom";
  if (value === "poor") return "Fraco";
  return "Precisa de atenção";
}

function statusLabel(value: TestStatus) {
  if (value === "pass") return "Passou";
  if (value === "fail") return "Falhou";
  return "Atenção";
}

function statusClasses(value: TestStatus) {
  if (value === "pass") return "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200";
  if (value === "fail") return "border-red-400/20 bg-red-400/[0.07] text-red-200";
  return "border-amber-400/20 bg-amber-400/[0.07] text-amber-200";
}

function kindLabel(value: TestKind) {
  if (value === "unknown") return "Fallback";
  if (value === "context") return "Contexto";
  if (value === "edge") return "Exceção";
  return "Knowledge";
}

export default function TesterClient({ clients, initialClientId = "" }: { clients: ClientOption[]; initialClientId?: string }) {
  const [clientId, setClientId] = useState(initialClientId);
  const [meta, setMeta] = useState<TesterMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [useAll, setUseAll] = useState(true);
  const [questionCount, setQuestionCount] = useState(28);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TesterResult | null>(null);
  const [filter, setFilter] = useState<"all" | "warning" | "fail">("all");

  useEffect(() => {
    setMeta(null);
    setSelectedIds([]);
    setUseAll(true);
    setResult(null);
    setError("");
    if (!clientId) return;

    let cancelled = false;
    setLoadingMeta(true);
    fetch(`/api/admin/clients/${clientId}/tester`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível carregar a Knowledge Base.");
        return data as TesterMeta;
      })
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a Knowledge Base.");
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });

    return () => { cancelled = true; };
  }, [clientId]);

  const selectedCount = useAll ? (meta?.entries.length ?? 0) : selectedIds.length;
  const canRun = Boolean(clientId && meta?.entries.length && selectedCount > 0 && !running);
  const filteredCases = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return result.cases;
    return result.cases.filter((item) => item.status === filter);
  }, [filter, result]);
  const filteredConversations = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return result.conversations;
    return result.conversations.filter((conversation) =>
      conversation.status === filter || conversation.turns.some((turn) => turn.status === filter),
    );
  }, [filter, result]);

  function toggleEntry(id: string) {
    setUseAll(false);
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function runTest() {
    if (!canRun) return;
    setRunning(true);
    setError("");
    setResult(null);
    setFilter("all");

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/tester`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledgeEntryIds: useAll ? [] : selectedIds,
          questionCount,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível concluir o teste.");
      setResult(data as TesterResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir o teste.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">QA automático</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tester</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
          Testa respostas isoladas e conversas contínuas com o agente real em modo preview, avaliando precisão, relevância, contexto, exceções e alucinações.
        </p>
      </div>

      <section className="mt-7 rounded-3xl border border-white/[0.07] bg-[#151515] p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="space-y-5">
            <label className="grid gap-2 text-xs text-white/45">
              Escolher cliente
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="min-h-12 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45"
              >
                <option value="">Seleciona um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs text-white/45">
              Profundidade do teste
              <select
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="min-h-12 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45"
              >
                <option value={18}>Rápido · 18 perguntas + 2 conversas</option>
                <option value={28}>Standard · 28 perguntas + 3 conversas</option>
                <option value={40}>Completo · 40 perguntas + 4 conversas</option>
              </select>
            </label>

            <div className="rounded-2xl border border-white/[0.06] bg-[#101010] p-4 text-xs leading-5 text-white/35">
              As conversas são simuladas apenas para QA e não ficam guardadas nem criam leads. Nos testes contínuos, o agente recebe o histórico real dos turnos anteriores e o retrieval usa o contexto recente, tal como no widget.
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white/85">Knowledge a testar</p>
                <p className="mt-1 text-xs text-white/35">Apenas entradas Públicas + Publicadas podem ser usadas pelo agente.</p>
              </div>
              {meta && meta.entries.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setUseAll(true); setSelectedIds([]); }}
                  className={`rounded-lg border px-3 py-2 text-xs transition ${useAll ? "border-[#ff7a18]/35 bg-[#ff7a18]/10 text-[#ffad69]" : "border-white/[0.08] text-white/45 hover:text-white"}`}
                >
                  Toda a Knowledge ({meta.entries.length})
                </button>
              )}
            </div>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              {!clientId && <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-white/30">Escolhe primeiro um cliente.</p>}
              {clientId && loadingMeta && <p className="rounded-xl border border-white/[0.06] px-4 py-8 text-center text-sm text-white/30">A carregar Knowledge Base…</p>}
              {meta && meta.entries.length === 0 && <p className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-5 text-sm text-amber-100/65">Este cliente ainda não tem entradas Públicas + Publicadas para testar.</p>}
              {meta?.entries.map((entry) => {
                const checked = useAll || selectedIds.includes(entry.id);
                return (
                  <label key={entry.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${checked ? "border-[#ff7a18]/20 bg-[#ff7a18]/[0.045]" : "border-white/[0.06] bg-[#101010] hover:border-white/[0.11]"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEntry(entry.id)}
                      className="mt-0.5 h-4 w-4 accent-[#ff7a18]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white/80">{entry.title}</span>
                      <span className="mt-1 block text-[11px] text-white/30">{entry.category} · {entry.sourceType === "website" ? "Website" : "Manual"}{entry.indexed ? " · indexado" : " · sem embedding"}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
          <p className="text-xs text-white/35">{selectedCount ? `${selectedCount} entrada${selectedCount === 1 ? "" : "s"} selecionada${selectedCount === 1 ? "" : "s"}` : "Nenhuma Knowledge selecionada"}</p>
          <button
            type="button"
            disabled={!canRun}
            onClick={runTest}
            className="min-w-40 rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {running ? "A testar agente…" : "Começar teste"}
          </button>
        </div>
      </section>

      {running && (
        <section className="mt-6 rounded-3xl border border-[#ff7a18]/15 bg-[#ff7a18]/[0.035] px-5 py-7 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#ff7a18]/20 border-t-[#ff8a32]" />
          <p className="mt-4 text-sm font-medium text-white/75">O Tester está a gerar perguntas, manter conversas completas com o agente e avaliar cada resposta.</p>
          <p className="mt-1 text-xs text-white/35">Os modos Standard e Completo fazem dezenas de interações reais e podem demorar mais do que a versão anterior.</p>
        </section>
      )}

      {error && (
        <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-100/75">{error}</div>
      )}

      {result && (
        <div className="mt-7 space-y-7">
          <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">Opinião do Tester</p>
                <h2 className="mt-1 text-2xl font-semibold">{verdictLabel(result.report.verdict)}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">{result.report.summary}</p>
                <p className="mt-3 text-xs text-white/30">
                  {result.scope.questionCount} interações · {result.scope.standaloneCount} perguntas isoladas · {result.scope.conversationCount} conversas contínuas ({result.scope.conversationTurns} turnos)
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-[#101010] px-5 py-4 text-center">
                <p className="text-4xl font-semibold tracking-tight">{result.report.score}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/30">Score / 100</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4"><p className="text-xs text-emerald-200/55">Passaram</p><p className="mt-1 text-2xl font-semibold text-emerald-100">{result.stats.pass}</p></div>
              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4"><p className="text-xs text-amber-200/55">Atenção</p><p className="mt-1 text-2xl font-semibold text-amber-100">{result.stats.warning}</p></div>
              <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-4"><p className="text-xs text-red-200/55">Falharam</p><p className="mt-1 text-2xl font-semibold text-red-100">{result.stats.fail}</p></div>
            </div>

            {(result.report.strengths.length > 0 || result.report.issues.length > 0 || result.report.recommendations.length > 0) && (
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <ReportList title="O que está bem" items={result.report.strengths} />
                <ReportList title="Problemas encontrados" items={result.report.issues} />
                <ReportList title="Recomendações" items={result.report.recommendations} />
              </div>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">Contexto real</p>
                <h2 className="mt-1 text-xl font-semibold">Conversas contínuas</h2>
                <p className="mt-1 text-xs text-white/35">Cada cenário mantém histórico entre mensagens para testar follow-ups, correções e memória contextual.</p>
              </div>
              <div className="flex gap-2">
                {(["all", "warning", "fail"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-lg border px-3 py-2 text-xs transition ${filter === value ? "border-[#ff7a18]/30 bg-[#ff7a18]/[0.08] text-[#ffad69]" : "border-white/[0.07] text-white/40 hover:text-white"}`}
                  >
                    {value === "all" ? "Todos" : value === "warning" ? "Atenção" : "Falhas"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {filteredConversations.map((conversation, conversationIndex) => (
                <details key={`${conversation.title}-${conversationIndex}`} className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.015]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${statusClasses(conversation.status)}`}>{statusLabel(conversation.status)}</span>
                        <span className="text-[11px] text-white/25">{conversation.score}/100</span>
                        <span className="rounded-full border border-sky-400/15 bg-sky-400/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-sky-200/65">{conversation.turns.length} turnos</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-white/85">{conversation.title}</p>
                      <p className="mt-1 text-xs leading-5 text-white/35">{conversation.goal}</p>
                    </div>
                    <span className="shrink-0 text-xs text-white/30 group-open:rotate-180">⌄</span>
                  </summary>

                  <div className="border-t border-white/[0.06] p-5">
                    <p className="text-sm leading-6 text-white/45">{conversation.reason}</p>
                    <div className="mt-5 space-y-5">
                      {conversation.turns.map((turn, turnIndex) => (
                        <div key={`${turn.question}-${turnIndex}`} className="rounded-2xl border border-white/[0.06] bg-[#101010] p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${statusClasses(turn.status)}`}>{statusLabel(turn.status)}</span>
                            <span className="text-[11px] text-white/25">Turno {turnIndex + 1} · {turn.score}/100</span>
                            <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-white/35">{kindLabel(turn.kind)}</span>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-white/[0.07] px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">Visitante</p>
                              <p className="mt-1 text-sm leading-6 text-white/80">{turn.question}</p>
                            </div>
                            <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-[#ff7a18]/10 bg-[#ff7a18]/[0.035] px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-[#ff9b52]/55">Agente</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/70">{turn.answer}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 border-t border-white/[0.05] pt-4 lg:grid-cols-2">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">Avaliação</p>
                              <p className="mt-1 text-xs leading-5 text-white/45">{turn.reason}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">Esperado</p>
                              <p className="mt-1 text-xs leading-5 text-white/45">{turn.expected}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
              {filteredConversations.length === 0 && <p className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-white/30">Não existem conversas neste filtro.</p>}
            </div>
          </section>

          <section>
            <div>
              <h2 className="text-xl font-semibold">Perguntas isoladas</h2>
              <p className="mt-1 text-xs text-white/35">Casos independentes para verificar Knowledge, exceções, relevância e fallback.</p>
            </div>

            <div className="mt-4 space-y-3">
              {filteredCases.map((item, index) => (
                <details key={`${item.question}-${index}`} className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.015]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${statusClasses(item.status)}`}>{statusLabel(item.status)}</span>
                        <span className="text-[11px] text-white/25">{item.score}/100</span>
                        <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-white/35">{kindLabel(item.kind)}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium leading-6 text-white/85">{item.question}</p>
                    </div>
                    <span className="shrink-0 text-xs text-white/30 group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="grid gap-4 border-t border-white/[0.06] p-5 lg:grid-cols-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">Resposta do agente</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{item.answer}</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">Avaliação</p>
                        <p className="mt-2 text-sm leading-6 text-white/55">{item.reason}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">Resposta esperada</p>
                        <p className="mt-2 text-sm leading-6 text-white/55">{item.expected}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">Objetivo do teste</p>
                        <p className="mt-2 text-xs leading-5 text-white/35">{item.goal}</p>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
              {filteredCases.length === 0 && <p className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-white/30">Não existem perguntas isoladas neste filtro.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#101010] p-4">
      <p className="text-xs font-medium text-white/70">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-xs leading-5 text-white/40">
          {items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
        </ul>
      ) : <p className="mt-3 text-xs text-white/25">Nada a destacar.</p>}
    </div>
  );
}
