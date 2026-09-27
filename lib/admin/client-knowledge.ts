import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type ClientKnowledgeVisibility = "public" | "internal";
export type ClientKnowledgeStatus = "draft" | "published";
export type ClientKnowledgeSource = "manual" | "website";

export type ClientKnowledgeEntry = {
  id: string;
  organization_id: string;
  slug: string;
  category: string;
  title: string;
  content: string;
  visibility: ClientKnowledgeVisibility;
  status: ClientKnowledgeStatus;
  source_type: ClientKnowledgeSource;
  source_url: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
};

export async function getClientKnowledgeEntries(organizationId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select(
      "id, organization_id, slug, category, title, content, visibility, status, source_type, source_url, embedding, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("source_type", { ascending: false })
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ClientKnowledgeEntry[];
}

export async function getClientKnowledgeStats(organizationId: string) {
  const entries = await getClientKnowledgeEntries(organizationId);
  return {
    total: entries.length,
    published: entries.filter((entry) => entry.status === "published").length,
    website: entries.filter((entry) => entry.source_type === "website").length,
    indexed: entries.filter((entry) => Boolean(entry.embedding)).length,
  };
}
