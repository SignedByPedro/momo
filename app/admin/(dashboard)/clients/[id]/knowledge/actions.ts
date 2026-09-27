"use server";

import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationOwnerAccess } from "@/lib/portal/auth";
import { getOrganization } from "@/lib/admin/organizations";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { tr } from "@/lib/i18n/ui";
import {
  getOrAnalyzeWebsite,
  inferBusinessTypeFromWebsite,
  websiteAnalysisToKnowledgeChunks,
} from "@/lib/web/website-analysis";

const allowedVisibility = new Set(["public", "internal"]);
const allowedStatus = new Set(["draft", "published"]);

function clean(value: FormDataEntryValue | null, max = 20_000) {
  return String(value ?? "").trim().slice(0, max);
}

function makeSlug(organizationId: string, title: string) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);

  return `org-${organizationId.slice(0, 8)}-${base || "knowledge"}-${crypto.randomUUID().slice(0, 8)}`;
}

function clientKnowledgePath(organizationId: string, surface: "admin" | "portal" = "admin") {
  return surface === "portal" ? "/portal/knowledge" : `/admin/clients/${organizationId}/knowledge`;
}

function redirectWith(organizationId: string, key: "notice" | "error", message: string, surface: "admin" | "portal" = "admin"): never {
  redirect(`${clientKnowledgePath(organizationId, surface)}?${key}=${encodeURIComponent(message)}`);
}

async function createEmbedding(title: string, content: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing.");

  const { embedding } = await embed({
    model: openai.embeddingModel("text-embedding-3-small"),
    value: `${title}\n\n${content}`,
  });

  return embedding;
}

export async function saveClientKnowledgeEntry(formData: FormData) {
  const organizationId = clean(formData.get("organizationId"), 100);
  if (!organizationId) return;
  const access = await requireOrganizationOwnerAccess(organizationId);
  const language = access.portal?.language ?? "pt";
  const id = clean(formData.get("id"), 100);
  const title = clean(formData.get("title"), 180);
  const category = clean(formData.get("category"), 80) || "FAQ";
  const content = clean(formData.get("content"));
  const visibility = clean(formData.get("visibility"), 20);
  const status = clean(formData.get("status"), 20);

  if (!title || !content) return;
  if (!allowedVisibility.has(visibility) || !allowedStatus.has(status)) return;

  const organization = await getOrganization(organizationId);
  if (!organization) throw new Error(tr(language, "Cliente não encontrado.", "Client not found."));

  const embedding =
    visibility === "public" && status === "published"
      ? await createEmbedding(title, content)
      : null;

  const supabase = createSupabaseAdmin();
  const payload = {
    organization_id: organizationId,
    agent_key: "client",
    category,
    title,
    content,
    visibility,
    status,
    source_type: "manual",
    source_url: null,
    embedding,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabase
      .from("knowledge_entries")
      .update(payload)
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("knowledge_entries").insert({
      ...payload,
      slug: makeSlug(organizationId, title),
    });

    if (error) throw error;
  }

  revalidatePath(clientKnowledgePath(organizationId, "admin"));
  revalidatePath("/portal/knowledge");
  revalidatePath(`/admin/clients/${organizationId}`);
  redirectWith(
    organizationId,
    "notice",
    tr(language, id ? "Conhecimento atualizado com sucesso." : "Conhecimento guardado com sucesso.", id ? "Knowledge updated successfully." : "Knowledge saved successfully."),
    access.surface,
  );
}

export async function deleteClientKnowledgeEntry(formData: FormData) {
  const organizationId = clean(formData.get("organizationId"), 100);
  if (!organizationId) return;
  const access = await requireOrganizationOwnerAccess(organizationId);
  const language = access.portal?.language ?? "pt";
  const id = clean(formData.get("id"), 100);
  if (!id) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("knowledge_entries")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) throw error;
  revalidatePath(clientKnowledgePath(organizationId, "admin"));
  revalidatePath("/portal/knowledge");
  revalidatePath(`/admin/clients/${organizationId}`);
  redirectWith(organizationId, "notice", tr(language, "Entrada apagada com sucesso.", "Entry deleted successfully."), access.surface);
}

export async function reindexClientKnowledge(formData: FormData) {
  const organizationId = clean(formData.get("organizationId"), 100);
  if (!organizationId) return;
  const access = await requireOrganizationOwnerAccess(organizationId);
  const language = access.portal?.language ?? "pt";
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing.");

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select("id, title, content")
    .eq("organization_id", organizationId)
    .eq("visibility", "public")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data?.length) redirectWith(organizationId, "notice", tr(language, "Não há conhecimento público publicado para indexar.", "There is no published public knowledge to index."), access.surface);

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
      .eq("organization_id", organizationId);

    if (updateError) throw updateError;
  }

  revalidatePath(clientKnowledgePath(organizationId, "admin"));
  revalidatePath("/portal/knowledge");
  redirectWith(organizationId, "notice", tr(language, `${data.length} entradas reindexadas.`, `${data.length} entries reindexed.`), access.surface);
}

export async function analyzeClientWebsite(formData: FormData) {
  const organizationId = clean(formData.get("organizationId"), 100);
  if (!organizationId) return;
  const access = await requireOrganizationOwnerAccess(organizationId);
  const language = access.portal?.language ?? "pt";

  const organization = await getOrganization(organizationId);
  if (!organization) redirectWith(organizationId, "error", tr(language, "Cliente não encontrado.", "Client not found."), access.surface);
  if (!organization.website) {
    redirectWith(organizationId, "error", tr(language, "Adiciona primeiro um website aos dados do cliente.", "Add a website to the company details first."), access.surface);
  }

  let importedCount = 0;

  try {
    const analysis = await getOrAnalyzeWebsite(organization.website);
    const chunks = websiteAnalysisToKnowledgeChunks(analysis);

    if (!chunks.length) {
      throw new Error("O website não devolveu conteúdo útil suficiente.");
    }

    const { embeddings } = await embedMany({
      model: openai.embeddingModel("text-embedding-3-small"),
      values: chunks.map((chunk) => `${chunk.title}\n\n${chunk.content}`),
    });

    const now = new Date().toISOString();
    const supabase = createSupabaseAdmin();

    // Only replace knowledge previously imported from the website.
    // Manual FAQ/policies remain untouched.
    const { error: deleteError } = await supabase
      .from("knowledge_entries")
      .delete()
      .eq("organization_id", organizationId)
      .eq("source_type", "website");

    if (deleteError) throw deleteError;

    const rows = chunks.map((chunk, index) => ({
      organization_id: organizationId,
      agent_key: "client",
      slug: makeSlug(organizationId, chunk.title),
      category: chunk.category,
      title: chunk.title,
      content: chunk.content,
      visibility: "public",
      status: "published",
      source_type: "website",
      source_url: chunk.sourceUrl,
      embedding: embeddings[index],
      updated_at: now,
    }));

    const { error: insertError } = await supabase.from("knowledge_entries").insert(rows);
    if (insertError) throw insertError;

    if (!organization.business_type) {
      const inferredType = inferBusinessTypeFromWebsite(analysis);
      if (inferredType) {
        await supabase
          .from("organizations")
          .update({ business_type: inferredType, updated_at: now })
          .eq("id", organizationId);
      }
    }

    importedCount = rows.length;
    revalidatePath(clientKnowledgePath(organizationId, "admin"));
  revalidatePath("/portal/knowledge");
    revalidatePath(`/admin/clients/${organizationId}`);
  } catch (error) {
    console.error("Client website knowledge import failed:", error);
    const message = error instanceof Error ? error.message : tr(language, "Não foi possível analisar o website.", "Could not analyze the website.");
    redirectWith(organizationId, "error", message, access.surface);
  }

  redirectWith(
    organizationId,
    "notice",
    tr(language, `${importedCount} páginas do website foram importadas e indexadas.`, `${importedCount} website pages were imported and indexed.`),
    access.surface,
  );
}
