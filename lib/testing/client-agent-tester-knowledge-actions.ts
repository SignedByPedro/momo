import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { revalidatePath } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ClientKnowledgeEntry } from "@/lib/admin/client-knowledge";
import type { TesterKnowledgeAction, TesterKnowledgeActionEntry } from "@/lib/testing/client-agent-tester";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeEntry(value: unknown): TesterKnowledgeActionEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = cleanText(row.title, 180);
  const category = cleanText(row.category, 80) || "FAQ";
  const content = cleanText(row.content, 8000);
  if (!title || !content) return null;
  return { title, category, content };
}

export function normalizeTesterKnowledgeAction(value: unknown): TesterKnowledgeAction | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = cleanText(row.id, 100);
  const type = row.type === "split" || row.type === "create" || row.type === "delete" || row.type === "update" ? row.type : null;
  if (!type || !isUuid(id)) return null;

  const targetEntryId = typeof row.targetEntryId === "string" && isUuid(row.targetEntryId) ? row.targetEntryId : null;
  const sourceEntryIds = Array.isArray(row.sourceEntryIds)
    ? Array.from(new Set(row.sourceEntryIds.filter((item): item is string => typeof item === "string" && isUuid(item)))).slice(0, 6)
    : [];
  const sourceVersions = Array.isArray(row.sourceVersions)
    ? row.sourceVersions.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const source = item as Record<string, unknown>;
      const sourceId = cleanText(source.id, 100);
      const updatedAt = cleanText(source.updatedAt, 100);
      const title = cleanText(source.title, 180);
      const sourceType = source.sourceType === "website" ? "website" as const : source.sourceType === "document" ? "document" as const : "manual" as const;
      if (!isUuid(sourceId) || !updatedAt) return [];
      return [{ id: sourceId, updatedAt, title, sourceType }];
    }).slice(0, 8)
    : [];
  const entries = Array.isArray(row.entries)
    ? row.entries.map(normalizeEntry).filter((item): item is TesterKnowledgeActionEntry => Boolean(item)).slice(0, 4)
    : [];

  if (type === "split" && (!targetEntryId || entries.length < 2)) return null;
  if (type === "create" && (sourceEntryIds.length < 1 || entries.length < 1)) return null;
  if (type === "delete" && (!targetEntryId || sourceEntryIds.length < 1 || sourceEntryIds.includes(targetEntryId))) return null;
  if (type === "update" && (!targetEntryId || entries.length !== 1)) return null;

  const requiredIds = new Set([targetEntryId, ...sourceEntryIds].filter((item): item is string => Boolean(item)));
  if (sourceVersions.length !== requiredIds.size || sourceVersions.some((source) => !requiredIds.has(source.id))) return null;

  return {
    id,
    type,
    title: cleanText(row.title, 180) || (type === "split" ? "Dividir entrada" : type === "create" ? "Criar entrada" : type === "update" ? "Atualizar entrada" : "Apagar entrada redundante"),
    rationale: cleanText(row.rationale, 1800),
    targetEntryId,
    sourceEntryIds,
    sourceVersions,
    entries: type === "delete" ? [] : entries,
  };
}

function actionSlugPrefix(organizationId: string, actionId: string) {
  return `org-${organizationId.slice(0, 8)}-tester-${actionId.slice(0, 8)}`;
}

function makeActionSlug(organizationId: string, actionId: string, index: number) {
  return `${actionSlugPrefix(organizationId, actionId)}-${index + 1}`;
}

async function createEmbeddings(entries: TesterKnowledgeActionEntry[]) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing.");
  const { embeddings } = await embedMany({
    model: openai.embeddingModel("text-embedding-3-small"),
    values: entries.map((entry) => `${entry.title}\n\n${entry.content}`),
  });
  return embeddings;
}

function revalidateKnowledge(organizationId: string) {
  revalidatePath(`/admin/clients/${organizationId}/knowledge`);
  revalidatePath(`/admin/clients/${organizationId}`);
  revalidatePath("/admin/tester");
  revalidatePath("/portal/knowledge");
}

export async function applyTesterKnowledgeAction(args: {
  organizationId: string;
  action: TesterKnowledgeAction;
}) {
  const { organizationId, action } = args;
  const supabase = createSupabaseAdmin();
  const prefix = actionSlugPrefix(organizationId, action.id);

  const { data: existingActionRows, error: existingActionError } = await supabase
    .from("knowledge_entries")
    .select("id, title")
    .eq("organization_id", organizationId)
    .like("slug", `${prefix}%`);
  if (existingActionError) throw existingActionError;

  if ((action.type === "create" || action.type === "split") && existingActionRows?.length) {
    return {
      alreadyApplied: true,
      message: action.type === "split" ? "Esta divisão já foi aplicada." : "Esta criação já foi aplicada.",
      created: existingActionRows,
    };
  }

  const referencedIds = action.sourceVersions.map((source) => source.id);
  const { data: currentRows, error: currentError } = await supabase
    .from("knowledge_entries")
    .select("id, organization_id, slug, category, title, content, visibility, status, source_type, source_url, embedding, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("agent_key", "client")
    .in("id", referencedIds);
  if (currentError) throw currentError;

  const currentById = new Map((currentRows ?? []).map((row) => [row.id as string, row as ClientKnowledgeEntry]));
  const targetMissing = Boolean(action.targetEntryId && !currentById.has(action.targetEntryId));
  if (action.type === "delete" && targetMissing) {
    return { alreadyApplied: true, message: "Esta entrada já não existe.", created: [] };
  }
  if (action.type === "split" && targetMissing) {
    throw new Error("A entrada original já não existe ou foi alterada. Corre novamente o Tester antes de aplicar esta divisão.");
  }
  if (currentRows?.length !== referencedIds.length) {
    throw new Error("A Knowledge Base mudou desde este teste. Corre novamente o Tester antes de aplicar a recomendação.");
  }

  for (const expected of action.sourceVersions) {
    const current = currentById.get(expected.id);
    if (!current || current.updated_at !== expected.updatedAt) {
      throw new Error(`A entrada “${expected.title || current?.title || "Knowledge"}” foi alterada desde o teste. Corre o Tester novamente.`);
    }
    if (current.visibility !== "public" || current.status !== "published") {
      throw new Error("Uma das entradas deixou de estar Pública + Publicada. Corre o Tester novamente.");
    }
  }

  if (action.type === "update") {
    const target = action.targetEntryId ? currentById.get(action.targetEntryId) : null;
    if (!target) throw new Error("A entrada já não existe. Corre novamente o Audit antes de guardar esta correção.");
    const [entry] = action.entries;
    const [embedding] = await createEmbeddings([entry]);
    const now = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("knowledge_entries")
      .update({
        title: entry.title,
        category: entry.category,
        content: entry.content,
        embedding,
        updated_at: now,
      })
      .eq("organization_id", organizationId)
      .eq("agent_key", "client")
      .eq("id", target.id)
      .eq("updated_at", target.updated_at)
      .select("id, title")
      .single();

    if (error || !updated) {
      throw error ?? new Error("A entrada mudou desde o Audit. Corre novamente antes de aplicar a correção.");
    }

    revalidateKnowledge(organizationId);
    return { alreadyApplied: false, message: `“${entry.title}” foi atualizada e reindexada.`, created: [updated] };
  }

  if (action.type === "delete") {
    const target = action.targetEntryId ? currentById.get(action.targetEntryId) : null;
    if (!target) return { alreadyApplied: true, message: "Esta entrada já não existe.", created: [] };
    const { error } = await supabase
      .from("knowledge_entries")
      .delete()
      .eq("organization_id", organizationId)
      .eq("agent_key", "client")
      .eq("id", target.id);
    if (error) throw error;
    revalidateKnowledge(organizationId);
    return { alreadyApplied: false, message: `“${target.title}” foi apagada da Knowledge Base.`, created: [] };
  }

  const embeddings = await createEmbeddings(action.entries);
  const now = new Date().toISOString();
  const splitSource = action.type === "split" && action.targetEntryId ? currentById.get(action.targetEntryId) : null;
  const rows = action.entries.map((entry, index) => ({
    organization_id: organizationId,
    agent_key: "client",
    slug: makeActionSlug(organizationId, action.id, index),
    category: entry.category,
    title: entry.title,
    content: entry.content,
    visibility: "public",
    status: "published",
    source_type: splitSource?.source_type ?? "manual",
    source_url: splitSource?.source_url ?? null,
    embedding: embeddings[index],
    updated_at: now,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("knowledge_entries")
    .insert(rows)
    .select("id, title");
  if (insertError) throw insertError;

  if (action.type === "split" && splitSource) {
    const { error: deleteError } = await supabase
      .from("knowledge_entries")
      .delete()
      .eq("organization_id", organizationId)
      .eq("agent_key", "client")
      .eq("id", splitSource.id)
      .eq("updated_at", splitSource.updated_at);

    if (deleteError) {
      const insertedIds = (inserted ?? []).map((row) => row.id as string).filter(Boolean);
      if (insertedIds.length) {
        await supabase.from("knowledge_entries").delete().in("id", insertedIds).eq("organization_id", organizationId);
      }
      throw deleteError;
    }
  }

  revalidateKnowledge(organizationId);
  return {
    alreadyApplied: false,
    message: action.type === "split"
      ? `A entrada foi dividida em ${rows.length} entradas e indexada.`
      : `${rows.length === 1 ? "A nova entrada foi criada" : `${rows.length} novas entradas foram criadas`} e indexada${rows.length === 1 ? "" : "s"}.`,
    created: inserted ?? [],
  };
}
