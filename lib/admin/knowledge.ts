import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type KnowledgeVisibility = "public" | "internal";
export type KnowledgeStatus = "draft" | "published";

export type KnowledgeEntry = {
  id: string;
  slug: string;
  agent_key: string;
  category: string;
  title: string;
  content: string;
  visibility: KnowledgeVisibility;
  status: KnowledgeStatus;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
};

export async function getKnowledgeEntries(agentKey = "momo-sales") {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("knowledge_entries")
    .select(
      "id, slug, agent_key, category, title, content, visibility, status, embedding, created_at, updated_at",
    )
    .eq("agent_key", agentKey)
    .order("status", { ascending: true })
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as KnowledgeEntry[];
}
