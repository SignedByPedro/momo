"use server";

import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const AGENT_KEY = "momo-support";
const allowedVisibility = new Set(["public", "internal"]);
const allowedStatus = new Set(["draft", "published"]);

function clean(value: FormDataEntryValue | null, max = 20_000) {
  return String(value ?? "").trim().slice(0, max);
}

function makeSlug(title: string) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return `support-${base || "knowledge"}-${crypto.randomUUID().slice(0, 8)}`;
}

async function createEmbedding(title: string, content: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing.");

  const { embedding } = await embed({
    model: openai.embeddingModel("text-embedding-3-small"),
    value: `${title}\n\n${content}`,
  });

  return embedding;
}

export async function saveSupportKnowledgeEntry(formData: FormData) {
  await requireAdmin();

  const id = clean(formData.get("id"), 100);
  const title = clean(formData.get("title"), 180);
  const category = clean(formData.get("category"), 80) || "Portal";
  const content = clean(formData.get("content"));
  const visibility = clean(formData.get("visibility"), 20);
  const status = clean(formData.get("status"), 20);

  if (!title || !content) return;
  if (!allowedVisibility.has(visibility) || !allowedStatus.has(status)) return;

  const embedding =
    visibility === "public" && status === "published"
      ? await createEmbedding(title, content)
      : null;

  const supabase = createSupabaseAdmin();
  const payload = {
    agent_key: AGENT_KEY,
    category,
    title,
    content,
    visibility,
    status,
    embedding,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabase
      .from("knowledge_entries")
      .update(payload)
      .eq("id", id)
      .eq("agent_key", AGENT_KEY);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("knowledge_entries").insert({
      ...payload,
      slug: makeSlug(title),
    });
    if (error) throw error;
  }

  revalidatePath("/admin/support/knowledge");
}

export async function deleteSupportKnowledgeEntry(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"), 100);
  if (!id) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("knowledge_entries")
    .delete()
    .eq("id", id)
    .eq("agent_key", AGENT_KEY);

  if (error) throw error;
  revalidatePath("/admin/support/knowledge");
}

export async function reindexSupportKnowledge() {
  await requireAdmin();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing.");

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("id, title, content")
    .eq("agent_key", AGENT_KEY)
    .eq("visibility", "public")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data?.length) return;

  const { embeddings } = await embedMany({
    model: openai.embeddingModel("text-embedding-3-small"),
    values: data.map((entry) => `${entry.title}\n\n${entry.content}`),
  });

  for (let index = 0; index < data.length; index += 1) {
    const { error: updateError } = await supabase
      .from("knowledge_entries")
      .update({
        embedding: embeddings[index],
        updated_at: new Date().toISOString(),
      })
      .eq("id", data[index].id)
      .eq("agent_key", AGENT_KEY);

    if (updateError) throw updateError;
  }

  revalidatePath("/admin/support/knowledge");
}
