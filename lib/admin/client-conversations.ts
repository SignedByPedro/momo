import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type ClientConversationListRow = {
  id: string;
  visitor_name: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
  messageCount: number;
  lastMessage: string | null;
  hasLead: boolean;
};

export async function getClientConversationStats(organizationId: string) {
  const supabase = createSupabaseAdmin();
  const [conversationsResult, leadsResult] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("source", "widget"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("source", "widget"),
  ]);

  if (conversationsResult.error) throw conversationsResult.error;
  if (leadsResult.error) throw leadsResult.error;

  return {
    conversations: conversationsResult.count ?? 0,
    leads: leadsResult.count ?? 0,
  };
}

export async function getClientConversations(organizationId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, visitor_name, language, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("source", "widget")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  const conversations = data ?? [];
  if (!conversations.length) return [] as ClientConversationListRow[];

  const ids = conversations.map((conversation) => conversation.id);
  const [messagesResult, leadsResult] = await Promise.all([
    supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("leads")
      .select("conversation_id")
      .in("conversation_id", ids),
  ]);

  if (messagesResult.error) throw messagesResult.error;
  if (leadsResult.error) throw leadsResult.error;

  const messageMeta = new Map<string, { count: number; lastMessage: string | null }>();
  for (const message of messagesResult.data ?? []) {
    const current = messageMeta.get(message.conversation_id) ?? {
      count: 0,
      lastMessage: null,
    };
    current.count += 1;
    current.lastMessage = message.content;
    messageMeta.set(message.conversation_id, current);
  }

  const leadIds = new Set((leadsResult.data ?? []).map((lead) => lead.conversation_id));

  return conversations.map((conversation) => ({
    ...conversation,
    messageCount: messageMeta.get(conversation.id)?.count ?? 0,
    lastMessage: messageMeta.get(conversation.id)?.lastMessage ?? null,
    hasLead: leadIds.has(conversation.id),
  })) as ClientConversationListRow[];
}

export async function getClientConversation(
  organizationId: string,
  conversationId: string,
) {
  const supabase = createSupabaseAdmin();
  const [conversationResult, messagesResult, leadResult] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, organization_id, visitor_name, language, created_at, updated_at")
      .eq("id", conversationId)
      .eq("organization_id", organizationId)
      .eq("source", "widget")
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, conversation_id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("leads")
      .select("id, name, email, phone, status, created_at")
      .eq("conversation_id", conversationId)
      .maybeSingle(),
  ]);

  if (conversationResult.error) throw conversationResult.error;
  if (messagesResult.error) throw messagesResult.error;
  if (leadResult.error) throw leadResult.error;

  return {
    conversation: conversationResult.data,
    messages: messagesResult.data ?? [],
    lead: leadResult.data,
  };
}
