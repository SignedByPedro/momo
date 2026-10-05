import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { revalidatePath } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type SupportKnowledgeDraft = {
  id: string;
  title: string;
  category: string;
  content: string;
};

function cleanText(value: string, max: number) {
  return value.trim().slice(0, max);
}

export function normalizeSupportKnowledgeDraft(value: unknown): SupportKnowledgeDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<SupportKnowledgeDraft>;
  const id = typeof draft.id === "string" ? draft.id.trim() : "";
  const title = typeof draft.title === "string" ? cleanText(draft.title, 180) : "";
  const category = typeof draft.category === "string" ? cleanText(draft.category, 80) : "";
  const content = typeof draft.content === "string" ? cleanText(draft.content, 8_000) : "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  if (!title || !content) return null;

  return {
    id,
    title,
    category: category || "FAQ",
    content,
  };
}

function knowledgeSlug(organizationId: string, draftId: string) {
  return `org-${organizationId.slice(0, 8)}-support-${draftId}`;
}

export async function createPublishedKnowledgeFromSupport(input: {
  organizationId: string;
  draft: SupportKnowledgeDraft;
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing.");

  const supabase = createSupabaseAdmin();
  const slug = knowledgeSlug(input.organizationId, input.draft.id);

  // A confirmation request can be retried by the browser. A stable slug tied to
  // the reviewed draft makes the write idempotent and prevents duplicate entries.
  const { data: existing, error: existingError } = await supabase
    .from("knowledge_entries")
    .select("id, title")
    .eq("organization_id", input.organizationId)
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    return { id: existing.id as string, title: existing.title as string, alreadyExisted: true };
  }

  const { embedding } = await embed({
    model: openai.embeddingModel("text-embedding-3-small"),
    value: `${input.draft.title}\n\n${input.draft.content}`,
  });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("knowledge_entries")
    .insert({
      organization_id: input.organizationId,
      agent_key: "client",
      slug,
      category: input.draft.category,
      title: input.draft.title,
      content: input.draft.content,
      visibility: "public",
      status: "published",
      source_type: "manual",
      source_url: null,
      embedding,
      updated_at: now,
    })
    .select("id, title")
    .single();

  if (error) {
    // If two identical confirmation requests raced, the second one may hit the
    // unique slug after the first has committed. Resolve it as a successful retry.
    const { data: raced } = await supabase
      .from("knowledge_entries")
      .select("id, title")
      .eq("organization_id", input.organizationId)
      .eq("slug", slug)
      .maybeSingle();
    if (raced) {
      return { id: raced.id as string, title: raced.title as string, alreadyExisted: true };
    }
    throw error;
  }

  revalidatePath("/portal/knowledge");
  revalidatePath(`/admin/clients/${input.organizationId}/knowledge`);
  revalidatePath(`/admin/clients/${input.organizationId}`);

  return { id: data.id as string, title: data.title as string, alreadyExisted: false };
}
