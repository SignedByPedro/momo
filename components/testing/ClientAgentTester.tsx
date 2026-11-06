"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ClientOption = {
  id: string;
  name: string;
  status: string;
};

type KnowledgeOption = {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
  sourceType: "manual" | "website" | "document";
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

type TesterKnowledgeActionEntry = {
  title: string;
  category: string;
  content: string;
};

type TesterKnowledgeAction = {
  id: string;
  type: "split" | "create" | "delete" | "update";
  title: string;
  rationale: string;
  targetEntryId: string | null;
  sourceEntryIds: string[];
  sourceVersions: Array<{
    id: string;
    title: string;
    updatedAt: string;
    sourceType: "manual" | "website" | "document";
  }>;
  entries: TesterKnowledgeActionEntry[];
};

type KnowledgeAuditIssueType = "duplicate" | "overlap" | "contradiction" | "mixed_topics" | "fragmented" | "vague";

type KnowledgeAuditIssue = {
  id: string;
  type: KnowledgeAuditIssueType;
  severity: "info" | "warning" | "critical";
  title: string;
  summary: string;
  entryIds: string[];
  recommendation: string;
};

type KnowledgeAuditResult = {
  organization: { id: string; name: string };
  scope: { selectedCount: number; allKnowledge: boolean };
  score: number;
  verdict: "excellent" | "good" | "needs_attention" | "poor";
  summary: string;
  issues: KnowledgeAuditIssue[];
  knowledgeActions: TesterKnowledgeAction[];
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
  knowledgeActions: TesterKnowledgeAction[];
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

function auditIssueLabel(value: KnowledgeAuditIssueType) {
  if (value === "duplicate") return "Duplicado";
  if (value === "overlap") return "Sobreposição";
  if (value === "contradiction") return "Contradição";
  if (value === "mixed_topics") return "Vários temas";
  if (value === "fragmented") return "Fragmentação";
  return "Informação vaga";
}

function auditSeverityClasses(value: KnowledgeAuditIssue["severity"]) {
  if (value === "critical") return "border-red-400/20 bg-red-400/[0.07] text-red-200";
  if (value === "warning") return "border-amber-400/20 bg-amber-400/[0.07] text-amber-200";
  return "border-sky-400/20 bg-sky-400/[0.07] text-sky-200";
}

type TesterSurface = "admin" | "portal";

type Props = {
  clients?: ClientOption[];
  initialClientId?: string;
  fixedClientId?: string;
  surface?: TesterSurface;
  embedded?: boolean;
};

export default function ClientAgentTester({
  clients = [],
  initialClientId = "",
  fixedClientId = "",
  surface = "admin",
  embedded = false,
}: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState(fixedClientId || initialClientId);
  const [meta, setMeta] = useState<TesterMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [useAll, setUseAll] = useState(true);
  const [questionCount, setQuestionCount] = useState(28);
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<KnowledgeAuditResult | null>(null);
  const [auditNeedsRefresh, setAuditNeedsRefresh] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TesterResult | null>(null);
  const [filter, setFilter] = useState<"all" | "warning" | "fail">("all");
  const [applyingActionId, setApplyingActionId] = useState("");
  const [actionMessages, setActionMessages] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [editingIssueId, setEditingIssueId] = useState("");
  const [issueEdits, setIssueEdits] = useState<Record<string, { title: string; category: string; content: string }>>({});
  const [issueMessage, setIssueMessage] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [savingIssueId, setSavingIssueId] = useState("");
  const [duplicateKeepByIssue, setDuplicateKeepByIssue] = useState<Record<string, string>>({});
  const testerEndpoint = (id: string) => surface === "portal" ? "/api/portal/tester" : `/api/admin/clients/${id}/tester`;
  const actionEndpoint = (id: string) => surface === "portal" ? "/api/portal/tester/knowledge-actions" : `/api/admin/clients/${id}/tester/knowledge-actions`;

  useEffect(() => {
    setMeta(null);
    setSelectedIds([]);
    setUseAll(true);
    setAudit(null);
    setAuditNeedsRefresh(false);
    setResult(null);
    setError("");
    setApplyingActionId("");
    setActionMessages({});
    setEditingIssueId("");
    setIssueEdits({});
    setIssueMessage({});
    setSavingIssueId("");
    setDuplicateKeepByIssue({});
    if (!clientId) return;

    let cancelled = false;
    setLoadingMeta(true);
    fetch(testerEndpoint(clientId), { cache: "no-store" })
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
  }, [clientId, surface]);

  const selectedCount = useAll ? (meta?.entries.length ?? 0) : selectedIds.length;
  const canAudit = Boolean(clientId && meta?.entries.length && selectedCount > 0 && !auditing && !running);
  const canRun = canAudit;
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

  function resetAuditForScopeChange() {
    setAudit(null);
    setAuditNeedsRefresh(false);
    setResult(null);
    setActionMessages({});
    setEditingIssueId("");
    setIssueEdits({});
    setIssueMessage({});
    setDuplicateKeepByIssue({});
  }

  function toggleEntry(id: string) {
    setUseAll(false);
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    resetAuditForScopeChange();
  }

  async function runAudit() {
    if (!canAudit) return;
    setAuditing(true);
    setError("");
    setAuditNeedsRefresh(false);
    setActionMessages({});

    try {
      const response = await fetch(testerEndpoint(clientId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "audit",
          knowledgeEntryIds: useAll ? [] : selectedIds,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível analisar a Knowledge Base.");
      setAudit(data as KnowledgeAuditResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível analisar a Knowledge Base.");
    } finally {
      setAuditing(false);
    }
  }

  async function runTest() {
    if (!canRun) return;
    setRunning(true);
    setError("");
    setResult(null);
    setFilter("all");

    try {
      const response = await fetch(testerEndpoint(clientId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "test",
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

  async function refreshKnowledgeMeta() {
    if (!clientId) return;
    const response = await fetch(testerEndpoint(clientId), { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    const nextMeta = data as TesterMeta;
    setMeta(nextMeta);
    const availableIds = new Set(nextMeta.entries.map((entry) => entry.id));
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }

  async function applyKnowledgeAction(action: TesterKnowledgeAction) {
    if (!clientId || applyingActionId) return;

    const verb = action.type === "split"
      ? "dividir esta entrada"
      : action.type === "create"
        ? "criar esta Knowledge"
        : action.type === "update"
          ? "guardar esta correção"
          : "apagar esta entrada";
    const warning = action.type === "delete"
      ? "Esta ação apaga a entrada selecionada. A informação só deve ser removida se estiver realmente coberta pelas entradas indicadas."
      : action.type === "update"
        ? "A entrada será atualizada e reindexada imediatamente."
        : "A alteração será aplicada diretamente à Knowledge Base e as novas entradas serão indexadas.";
    if (!window.confirm(`Confirmas que queres ${verb}?\n\n${warning}`)) return;

    setApplyingActionId(action.id);
    setActionMessages((current) => {
      const next = { ...current };
      delete next[action.id];
      return next;
    });

    try {
      const response = await fetch(actionEndpoint(clientId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível aplicar a alteração.");
      setActionMessages((current) => ({
        ...current,
        [action.id]: { ok: true, message: `${typeof data.message === "string" ? data.message : "Alteração aplicada à Knowledge Base."} Volta a analisar a Knowledge antes de testar o agente.` },
      }));
      setAuditNeedsRefresh(true);
      setResult(null);
      await refreshKnowledgeMeta();
      router.refresh();
    } catch (reason) {
      setActionMessages((current) => ({
        ...current,
        [action.id]: { ok: false, message: reason instanceof Error ? reason.message : "Não foi possível aplicar a alteração." },
      }));
    } finally {
      setApplyingActionId("");
    }
  }


  function actionsForAuditIssue(issue: KnowledgeAuditIssue) {
    if (!audit) return [];
    const ids = new Set(issue.entryIds);
    return audit.knowledgeActions.filter((action) => {
      const relatedIds = [action.targetEntryId, ...action.sourceEntryIds].filter((id): id is string => Boolean(id));
      if (!relatedIds.some((id) => ids.has(id))) return false;
      if (issue.type === "duplicate") return action.type === "delete";
      if (issue.type === "mixed_topics") return action.type === "split";
      if (issue.type === "fragmented") return action.type === "create" || action.type === "delete" || action.type === "update";
      if (issue.type === "overlap") return action.type === "delete" || action.type === "create" || action.type === "update";
      if (issue.type === "vague") return action.type === "update";
      return false;
    }).slice(0, 2);
  }

  function beginIssueCorrection(issue: KnowledgeAuditIssue) {
    const next: Record<string, { title: string; category: string; content: string }> = {};
    for (const id of issue.entryIds) {
      const entry = meta?.entries.find((item) => item.id === id);
      if (!entry) continue;
      next[id] = { title: entry.title, category: entry.category, content: entry.content };
    }
    setIssueEdits(next);
    setEditingIssueId(issue.id);
    setIssueMessage((current) => {
      const copy = { ...current };
      delete copy[issue.id];
      return copy;
    });
  }

  async function saveIssueCorrection(issue: KnowledgeAuditIssue) {
    if (!clientId || savingIssueId) return;
    const changed = issue.entryIds.flatMap((id) => {
      const original = meta?.entries.find((entry) => entry.id === id);
      const edited = issueEdits[id];
      if (!original || !edited) return [];
      const normalized = {
        title: edited.title.trim(),
        category: edited.category.trim() || "FAQ",
        content: edited.content.trim(),
      };
      if (!normalized.title || !normalized.content) return [];
      const same = normalized.title === original.title
        && normalized.category === original.category
        && normalized.content === original.content;
      return same ? [] : [{ original, edited: normalized }];
    });

    if (!changed.length) {
      setIssueMessage((current) => ({ ...current, [issue.id]: { ok: false, message: "Não fizeste nenhuma alteração às entradas." } }));
      return;
    }

    setSavingIssueId(issue.id);
    setIssueMessage((current) => {
      const copy = { ...current };
      delete copy[issue.id];
      return copy;
    });

    try {
      for (const { original, edited } of changed) {
        const action: TesterKnowledgeAction = {
          id: crypto.randomUUID(),
          type: "update",
          title: `Corrigir “${original.title}”`,
          rationale: `Correção manual guiada pelo Knowledge Audit: ${issue.title}`,
          targetEntryId: original.id,
          sourceEntryIds: [],
          sourceVersions: [{
            id: original.id,
            title: original.title,
            updatedAt: original.updatedAt,
            sourceType: original.sourceType,
          }],
          entries: [edited],
        };
        const response = await fetch(actionEndpoint(clientId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível guardar a correção.");
      }

      setIssueMessage((current) => ({
        ...current,
        [issue.id]: { ok: true, message: `${changed.length === 1 ? "Entrada atualizada" : `${changed.length} entradas atualizadas`} e reindexada${changed.length === 1 ? "" : "s"}. Volta a analisar a Knowledge.` },
      }));
      setEditingIssueId("");
      setAuditNeedsRefresh(true);
      setResult(null);
      await refreshKnowledgeMeta();
      router.refresh();
    } catch (reason) {
      setIssueMessage((current) => ({
        ...current,
        [issue.id]: { ok: false, message: reason instanceof Error ? reason.message : "Não foi possível guardar a correção." },
      }));
    } finally {
      setSavingIssueId("");
    }
  }


  async function resolveDuplicateIssue(issue: KnowledgeAuditIssue) {
    if (!clientId || savingIssueId || issue.entryIds.length < 2) return;
    const keepId = duplicateKeepByIssue[issue.id] || issue.entryIds[0];
    const keep = meta?.entries.find((entry) => entry.id === keepId);
    const targets = issue.entryIds
      .filter((id) => id !== keepId)
      .map((id) => meta?.entries.find((entry) => entry.id === id))
      .filter((entry): entry is KnowledgeOption => Boolean(entry));

    if (!keep || !targets.length) return;
    if (!window.confirm(`Manter “${keep.title}” e apagar ${targets.length === 1 ? `“${targets[0].title}”` : `${targets.length} entradas duplicadas`}?\n\nConfirma apenas se a entrada que vais manter preserva toda a informação necessária.`)) return;

    setSavingIssueId(issue.id);
    try {
      for (const target of targets) {
        const action: TesterKnowledgeAction = {
          id: crypto.randomUUID(),
          type: "delete",
          title: `Apagar duplicado “${target.title}”`,
          rationale: `Decisão manual no Knowledge Audit. Manter “${keep.title}” como fonte principal.`,
          targetEntryId: target.id,
          sourceEntryIds: [keep.id],
          sourceVersions: [
            { id: target.id, title: target.title, updatedAt: target.updatedAt, sourceType: target.sourceType },
            { id: keep.id, title: keep.title, updatedAt: keep.updatedAt, sourceType: keep.sourceType },
          ],
          entries: [],
        };
        const response = await fetch(actionEndpoint(clientId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível apagar o duplicado.");
      }

      setIssueMessage((current) => ({
        ...current,
        [issue.id]: { ok: true, message: `${targets.length === 1 ? "Duplicado apagado" : "Duplicados apagados"}. Volta a analisar a Knowledge.` },
      }));
      setAuditNeedsRefresh(true);
      setResult(null);
      await refreshKnowledgeMeta();
      router.refresh();
    } catch (reason) {
      setIssueMessage((current) => ({
        ...current,
        [issue.id]: { ok: false, message: reason instanceof Error ? reason.message : "Não foi possível resolver o duplicado." },
      }));
    } finally {
      setSavingIssueId("");
    }
  }

  async function deleteRelatedEntry(issue: KnowledgeAuditIssue, targetId: string) {
    if (!clientId || savingIssueId || issue.entryIds.length < 2) return;
    const target = meta?.entries.find((entry) => entry.id === targetId);
    const support = issue.entryIds
      .filter((id) => id !== targetId)
      .map((id) => meta?.entries.find((entry) => entry.id === id))
      .filter((entry): entry is KnowledgeOption => Boolean(entry));
    if (!target || !support.length) return;

    const supportNames = support.map((entry) => `“${entry.title}”`).join(", ");
    if (!window.confirm(`Apagar “${target.title}”?\n\nEsta entrada está relacionada com ${supportNames}, mas pode conter detalhes únicos. Confirma apenas se queres mesmo removê-la depois de rever o conteúdo.`)) return;

    setSavingIssueId(issue.id);
    setIssueMessage((current) => {
      const next = { ...current };
      delete next[issue.id];
      return next;
    });

    try {
      const action: TesterKnowledgeAction = {
        id: crypto.randomUUID(),
        type: "delete",
        title: `Apagar “${target.title}”`,
        rationale: `Eliminação manual escolhida no Knowledge Audit para resolver ${auditIssueLabel(issue.type).toLowerCase()}: ${issue.title}`,
        targetEntryId: target.id,
        sourceEntryIds: support.map((entry) => entry.id).slice(0, 6),
        sourceVersions: [target, ...support.slice(0, 6)].map((entry) => ({
          id: entry.id,
          title: entry.title,
          updatedAt: entry.updatedAt,
          sourceType: entry.sourceType,
        })),
        entries: [],
      };
      const response = await fetch(actionEndpoint(clientId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível apagar a entrada.");

      setIssueMessage((current) => ({
        ...current,
        [issue.id]: { ok: true, message: `“${target.title}” foi apagada. Volta a analisar a Knowledge.` },
      }));
      setAuditNeedsRefresh(true);
      setResult(null);
      await refreshKnowledgeMeta();
      router.refresh();
    } catch (reason) {
      setIssueMessage((current) => ({
        ...current,
        [issue.id]: { ok: false, message: reason instanceof Error ? reason.message : "Não foi possível apagar a entrada." },
      }));
    } finally {
      setSavingIssueId("");
    }
  }

  return (
    <div className="max-w-6xl">
      <div id="tester">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">QA automático</p>
        {embedded ? (
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Tester do agente</h2>
        ) : (
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tester</h1>
        )}
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
          Usa as duas ferramentas de forma independente: faz um Audit para avaliar e limpar a estrutura da Knowledge, ou testa diretamente o agente com perguntas isoladas e conversas contínuas em modo preview.
        </p>
      </div>

      <section className="mt-7 rounded-3xl border border-white/[0.07] bg-[#151515] p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="space-y-5">
            {!fixedClientId && (
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
            )}

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
                <p className="text-sm font-medium text-white/85">Knowledge selecionada</p>
                <p className="mt-1 text-xs text-white/35">Usa esta seleção no Audit, no teste do agente ou em ambos. Apenas entradas Públicas + Publicadas são consideradas.</p>
              </div>
              {meta && meta.entries.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setUseAll(true); setSelectedIds([]); resetAuditForScopeChange(); }}
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
                      <span className="mt-1 block text-[11px] text-white/30">{entry.category} · {entry.sourceType === "website" ? "Website" : entry.sourceType === "document" ? "Documento" : "Manual"}{entry.indexed ? " · indexado" : " · sem embedding"}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
          <div>
            <p className="text-xs text-white/35">{selectedCount ? `${selectedCount} entrada${selectedCount === 1 ? "" : "s"} selecionada${selectedCount === 1 ? "" : "s"}` : "Nenhuma Knowledge selecionada"}</p>
            {auditNeedsRefresh && <p className="mt-1 text-xs text-amber-200/60">A Knowledge foi alterada. O Audit anterior está desatualizado; volta a analisá-la quando quiseres atualizar esse diagnóstico.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canAudit}
              onClick={runAudit}
              className={`${audit && !auditNeedsRefresh ? "border border-white/[0.09] bg-white/[0.025] text-white/70 hover:bg-white/[0.05]" : "bg-[#ff7a18] text-[#151515] hover:bg-[#ff9138]"} min-w-40 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35`}
            >
              {auditing ? "A analisar…" : audit ? "Analisar novamente" : "Analisar Knowledge"}
            </button>
            <button
              type="button"
              disabled={!canRun}
              onClick={runTest}
              className="min-w-40 rounded-xl border border-[#ff7a18]/35 bg-[#ff7a18]/[0.07] px-5 py-3 text-sm font-semibold text-[#ffad69] transition hover:bg-[#ff7a18]/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {running ? "A testar agente…" : "Testar agente"}
            </button>
          </div>
        </div>
      </section>

      {auditing && (
        <section className="mt-6 rounded-3xl border border-[#ff7a18]/15 bg-[#ff7a18]/[0.035] px-5 py-7 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#ff7a18]/20 border-t-[#ff8a32]" />
          <p className="mt-4 text-sm font-medium text-white/75">O Tester está a auditar a estrutura da Knowledge Base.</p>
          <p className="mt-1 text-xs text-white/35">Procura duplicados, sobreposição, contradições, tópicos misturados, fragmentação e informação vaga.</p>
        </section>
      )}

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

      {audit && (
        <div className="mt-7 space-y-6">
          <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">Knowledge Audit</p>
                <h2 className="mt-1 text-2xl font-semibold">{verdictLabel(audit.verdict)}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">{audit.summary}</p>
                <p className="mt-3 text-xs text-white/30">{audit.scope.selectedCount} entrada{audit.scope.selectedCount === 1 ? "" : "s"} analisada{audit.scope.selectedCount === 1 ? "" : "s"} · {audit.issues.length} problema{audit.issues.length === 1 ? "" : "s"} encontrado{audit.issues.length === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-[#101010] px-5 py-4 text-center">
                <p className="text-4xl font-semibold tracking-tight">{audit.score}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/30">Knowledge / 100</p>
              </div>
            </div>

            {audit.issues.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-4 text-sm text-emerald-100/70">
                Não foram encontrados problemas estruturais relevantes. Podes avançar para o teste do agente.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {audit.issues.map((issue) => {
                  const titles = issue.entryIds
                    .map((id) => meta?.entries.find((entry) => entry.id === id)?.title)
                    .filter((title): title is string => Boolean(title));
                  const inlineActions = actionsForAuditIssue(issue);
                  const correctionMessage = issueMessage[issue.id];
                  const hasSuggestedUpdate = inlineActions.some((action) => action.type === "update");
                  const canEditIssue = issue.type === "contradiction"
                    || ((issue.type === "vague" || issue.type === "overlap") && !hasSuggestedUpdate);
                  return (
                    <div key={issue.id} className="rounded-2xl border border-white/[0.07] bg-[#101010] p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${auditSeverityClasses(issue.severity)}`}>{auditIssueLabel(issue.type)}</span>
                        {issue.severity === "critical" && <span className="text-[10px] uppercase tracking-[0.1em] text-red-200/55">Crítico</span>}
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-white/85">{issue.title}</h3>
                      {titles.length > 0 && <p className="mt-1 text-[11px] text-white/30">{titles.join(" · ")}</p>}
                      <p className="mt-3 text-xs leading-5 text-white/50">{issue.summary}</p>
                      <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-3">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">Recomendação</p>
                        <p className="mt-1 text-xs leading-5 text-white/50">{issue.recommendation}</p>
                      </div>

                      {inlineActions.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {inlineActions.map((action) => {
                            const message = actionMessages[action.id];
                            const isApplying = applyingActionId === action.id;
                            const isApplied = Boolean(message?.ok);
                            const target = action.targetEntryId ? action.sourceVersions.find((entry) => entry.id === action.targetEntryId) : null;
                            return (
                              <div key={`${issue.id}-${action.id}`} className="rounded-xl border border-[#ff7a18]/15 bg-[#ff7a18]/[0.025] p-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#ff9a4f]">
                                      {action.type === "split" ? "Correção sugerida · Dividir" : action.type === "create" ? "Correção sugerida · Criar" : action.type === "update" ? "Correção sugerida · Atualizar" : "Correção sugerida · Apagar"}
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-white/70">{action.title}</p>
                                    <p className="mt-1 text-[11px] leading-5 text-white/40">{action.rationale}</p>
                                    {target && <p className="mt-1 text-[11px] text-white/25">Entrada: {target.title}</p>}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isApplying || isApplied || Boolean(applyingActionId && applyingActionId !== action.id)}
                                    onClick={() => applyKnowledgeAction(action)}
                                    className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${action.type === "delete" ? "border border-red-400/20 bg-red-400/[0.06] text-red-100 hover:bg-red-400/[0.1]" : "bg-[#ff7a18] text-[#151515] hover:bg-[#ff9138]"}`}
                                  >
                                    {isApplied ? "Aplicado" : isApplying ? "A aplicar…" : action.type === "split" ? "Dividir agora" : action.type === "create" ? "Criar agora" : action.type === "update" ? "Aplicar correção" : "Apagar entrada"}
                                  </button>
                                </div>
                                {action.type === "update" && action.targetEntryId && action.entries[0] && (() => {
                                  const currentEntry = meta?.entries.find((entry) => entry.id === action.targetEntryId);
                                  const proposed = action.entries[0];
                                  if (!currentEntry) return null;
                                  return (
                                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                                      <div className="rounded-lg border border-white/[0.05] bg-black/10 p-3">
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">Atual</p>
                                        <p className="mt-1 text-[11px] font-medium text-white/55">{currentEntry.title}</p>
                                        <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-white/35">{currentEntry.content}</p>
                                      </div>
                                      <div className="rounded-lg border border-[#ff7a18]/15 bg-[#ff7a18]/[0.02] p-3">
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-[#ff9a4f]">Proposta</p>
                                        <p className="mt-1 text-[11px] font-medium text-white/70">{proposed.title}</p>
                                        <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-white/50">{proposed.content}</p>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {action.entries.length > 0 && action.type !== "update" && (
                                  <div className="mt-3 space-y-2">
                                    {action.entries.map((entry, index) => (
                                      <details key={`${issue.id}-${action.id}-entry-${index}`} className="rounded-lg border border-white/[0.05] bg-black/10">
                                        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] text-white/55">{entry.title} <span className="text-white/25">· {entry.category}</span></summary>
                                        <p className="border-t border-white/[0.05] px-3 py-2 whitespace-pre-wrap text-[11px] leading-5 text-white/40">{entry.content}</p>
                                      </details>
                                    ))}
                                  </div>
                                )}
                                {message && <p className={`mt-2 text-[11px] ${message.ok ? "text-emerald-200/65" : "text-red-200/65"}`}>{message.message}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {issue.type === "duplicate" && inlineActions.length === 0 && issue.entryIds.length >= 2 && (
                        <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.025] p-3">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-amber-200/55">Resolver duplicado</p>
                          <p className="mt-1 text-[11px] leading-5 text-white/40">Escolhe a entrada que contém a versão que queres manter. As restantes entradas assinaladas como duplicadas serão apagadas apenas depois da tua confirmação.</p>
                          <div className="mt-3 grid gap-2">
                            {issue.entryIds.map((id) => {
                              const entry = meta?.entries.find((item) => item.id === id);
                              if (!entry) return null;
                              const selected = (duplicateKeepByIssue[issue.id] || issue.entryIds[0]) === id;
                              return (
                                <label key={`${issue.id}-keep-${id}`} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${selected ? "border-[#ff7a18]/25 bg-[#ff7a18]/[0.04]" : "border-white/[0.06] bg-black/10"}`}>
                                  <input
                                    type="radio"
                                    name={`duplicate-${issue.id}`}
                                    checked={selected}
                                    onChange={() => setDuplicateKeepByIssue((current) => ({ ...current, [issue.id]: id }))}
                                    className="mt-0.5 accent-[#ff7a18]"
                                  />
                                  <span>
                                    <span className="block text-[11px] font-medium text-white/65">{entry.title}</span>
                                    <span className="mt-0.5 block max-h-8 overflow-hidden text-[10px] leading-4 text-white/30">{entry.content}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div>{correctionMessage && <p className={`text-[11px] ${correctionMessage.ok ? "text-emerald-200/65" : "text-red-200/65"}`}>{correctionMessage.message}</p>}</div>
                            <button
                              type="button"
                              disabled={savingIssueId === issue.id}
                              onClick={() => resolveDuplicateIssue(issue)}
                              className="rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[11px] font-semibold text-red-100 transition hover:bg-red-400/[0.1] disabled:opacity-40"
                            >
                              {savingIssueId === issue.id ? "A aplicar…" : "Manter selecionada e apagar duplicado"}
                            </button>
                          </div>
                        </div>
                      )}

                      {(issue.type === "overlap" || issue.type === "contradiction" || issue.type === "fragmented") && issue.entryIds.length >= 2 && (
                        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.012] p-3">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">Gerir entradas relacionadas</p>
                          <p className="mt-1 text-[11px] leading-5 text-white/40">
                            Mesmo quando não são duplicados exatos, podes remover uma entrada que consideres desnecessária. Revê primeiro os detalhes únicos de cada uma.
                          </p>
                          <div className="mt-3 space-y-2">
                            {issue.entryIds.map((id) => {
                              const entry = meta?.entries.find((item) => item.id === id);
                              if (!entry) return null;
                              return (
                                <div key={`${issue.id}-related-${id}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/[0.05] bg-black/10 p-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-medium text-white/60">{entry.title}</p>
                                    <p className="mt-1 max-h-12 overflow-hidden text-[10px] leading-4 text-white/30">{entry.content}</p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={savingIssueId === issue.id}
                                    onClick={() => deleteRelatedEntry(issue, id)}
                                    className="shrink-0 rounded-lg border border-red-400/15 bg-red-400/[0.04] px-3 py-2 text-[10px] font-semibold text-red-100/70 transition hover:bg-red-400/[0.08] disabled:opacity-40"
                                  >
                                    Apagar esta entrada
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {canEditIssue && (
                        <div className="mt-4">
                          {editingIssueId !== issue.id ? (
                            <button
                              type="button"
                              onClick={() => beginIssueCorrection(issue)}
                              className="rounded-xl border border-white/[0.1] bg-white/[0.035] px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.06]"
                            >
                              {issue.type === "contradiction" ? "Resolver contradição" : "Corrigir informação"}
                            </button>
                          ) : (
                            <div className="space-y-3 rounded-xl border border-white/[0.07] bg-black/10 p-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">Corrigir dentro do Tester</p>
                                <p className="mt-1 text-[11px] leading-5 text-white/40">
                                  Edita apenas o que sabes estar correto. O Tester não escolhe automaticamente qual versão de uma contradição é verdadeira.
                                </p>
                              </div>
                              {issue.entryIds.map((id) => {
                                const original = meta?.entries.find((entry) => entry.id === id);
                                const edited = issueEdits[id];
                                if (!original || !edited) return null;
                                return (
                                  <div key={`${issue.id}-edit-${id}`} className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                                    <p className="mb-2 text-[11px] font-medium text-white/60">{original.title}</p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <input
                                        value={edited.title}
                                        onChange={(event) => setIssueEdits((current) => ({ ...current, [id]: { ...current[id], title: event.target.value } }))}
                                        className="rounded-lg border border-white/[0.07] bg-[#0d0d0d] px-3 py-2 text-xs text-white/75 outline-none focus:border-[#ff7a18]/40"
                                        aria-label={`Título de ${original.title}`}
                                      />
                                      <input
                                        value={edited.category}
                                        onChange={(event) => setIssueEdits((current) => ({ ...current, [id]: { ...current[id], category: event.target.value } }))}
                                        className="rounded-lg border border-white/[0.07] bg-[#0d0d0d] px-3 py-2 text-xs text-white/75 outline-none focus:border-[#ff7a18]/40"
                                        aria-label={`Categoria de ${original.title}`}
                                      />
                                    </div>
                                    <textarea
                                      value={edited.content}
                                      onChange={(event) => setIssueEdits((current) => ({ ...current, [id]: { ...current[id], content: event.target.value } }))}
                                      rows={5}
                                      className="mt-2 w-full resize-y rounded-lg border border-white/[0.07] bg-[#0d0d0d] px-3 py-2 text-xs leading-5 text-white/70 outline-none focus:border-[#ff7a18]/40"
                                      aria-label={`Conteúdo de ${original.title}`}
                                    />
                                  </div>
                                );
                              })}
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  {correctionMessage && <p className={`text-[11px] ${correctionMessage.ok ? "text-emerald-200/65" : "text-red-200/65"}`}>{correctionMessage.message}</p>}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingIssueId("")}
                                    disabled={savingIssueId === issue.id}
                                    className="rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] text-white/50 disabled:opacity-40"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveIssueCorrection(issue)}
                                    disabled={savingIssueId === issue.id}
                                    className="rounded-lg bg-[#ff7a18] px-3 py-2 text-[11px] font-semibold text-[#151515] disabled:opacity-40"
                                  >
                                    {savingIssueId === issue.id ? "A guardar…" : "Guardar correção"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {editingIssueId !== issue.id && correctionMessage && (
                            <p className={`mt-2 text-[11px] ${correctionMessage.ok ? "text-emerald-200/65" : "text-red-200/65"}`}>{correctionMessage.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
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

          {result.knowledgeActions.length > 0 && (
            <section className="rounded-3xl border border-[#ff7a18]/15 bg-[#ff7a18]/[0.025] p-5 sm:p-7">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#ff8a32]">Otimização de Knowledge</p>
                <h2 className="mt-1 text-xl font-semibold">Alterações sugeridas pelo Tester</h2>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">
                  O Tester pode propor reorganizações com base apenas em informação já confirmada. Nada é alterado até reveres a proposta e carregares em aplicar.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {result.knowledgeActions.map((action) => {
                  const message = actionMessages[action.id];
                  const target = action.targetEntryId ? action.sourceVersions.find((entry) => entry.id === action.targetEntryId) : null;
                  const supporting = action.sourceVersions.filter((entry) => entry.id !== action.targetEntryId);
                  const isApplying = applyingActionId === action.id;
                  const isApplied = Boolean(message?.ok);
                  return (
                    <div key={action.id} className="rounded-2xl border border-white/[0.07] bg-[#101010] p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${action.type === "delete" ? "border-red-400/20 bg-red-400/[0.05] text-red-200/70" : "border-[#ff7a18]/20 bg-[#ff7a18]/[0.05] text-[#ffad69]"}`}>
                              {action.type === "split" ? "Dividir" : action.type === "create" ? "Criar" : "Apagar"}
                            </span>
                            {action.sourceVersions.some((entry) => entry.sourceType === "website") && (
                              <span className="rounded-full border border-sky-400/15 bg-sky-400/[0.04] px-2 py-1 text-[10px] text-sky-200/60">Inclui Knowledge do website</span>
                            )}
                            {action.sourceVersions.some((entry) => entry.sourceType === "document") && (
                              <span className="rounded-full border border-violet-400/15 bg-violet-400/[0.04] px-2 py-1 text-[10px] text-violet-200/60">Inclui Knowledge de documento</span>
                            )}
                          </div>
                          <h3 className="mt-2 text-sm font-semibold text-white/85">{action.title}</h3>
                          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/45">{action.rationale}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {target && (
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">Entrada afetada</p>
                            <p className="mt-1 text-xs font-medium text-white/65">{target.title}</p>
                          </div>
                        )}
                        {supporting.length > 0 && (
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">Informação de suporte</p>
                            <p className="mt-1 text-xs leading-5 text-white/55">{supporting.map((entry) => entry.title).join(" · ")}</p>
                          </div>
                        )}
                      </div>

                      {action.entries.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">{action.type === "split" ? "Novas entradas propostas" : "Entrada proposta"}</p>
                          {action.entries.map((entry, index) => (
                            <details key={`${action.id}-${index}`} open={action.entries.length === 1} className="rounded-xl border border-white/[0.06] bg-white/[0.012]">
                              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-white/70">{index + 1}. {entry.title} <span className="ml-2 text-white/25">· {entry.category}</span></summary>
                              <p className="border-t border-white/[0.05] px-4 py-3 whitespace-pre-wrap text-xs leading-5 text-white/45">{entry.content}</p>
                            </details>
                          ))}
                        </div>
                      )}

                      {action.type === "delete" && (
                        <p className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.035] px-4 py-3 text-xs leading-5 text-red-100/55">
                          Esta ação é destrutiva. Confirma que a informação da entrada a apagar está realmente preservada nas entradas de suporte indicadas acima.
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-4">
                        {message ? (
                          <p className={`text-xs ${message.ok ? "text-emerald-200/70" : "text-red-200/70"}`}>{message.message}</p>
                        ) : <p className="text-xs text-white/25">Revê a proposta antes de aplicar.</p>}
                        <button
                          type="button"
                          disabled={isApplying || isApplied || Boolean(applyingActionId && applyingActionId !== action.id)}
                          onClick={() => applyKnowledgeAction(action)}
                          className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${action.type === "delete" ? "border border-red-400/20 bg-red-400/[0.06] text-red-100 hover:bg-red-400/[0.1]" : "bg-[#ff7a18] text-[#151515] hover:bg-[#ff9138]"}`}
                        >
                          {isApplied ? "Alteração aplicada" : isApplying ? "A aplicar…" : action.type === "split" ? "Aplicar divisão" : action.type === "create" ? "Criar Knowledge" : "Apagar entrada"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

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
