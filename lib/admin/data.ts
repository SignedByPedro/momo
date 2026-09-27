import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type LeadStatus = "new" | "contacted" | "won" | "lost";

export type LeadRow = {
  id: string;
  conversation_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  business_type: string | null;
  status: LeadStatus;
  converted_organization_id: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ConversationRow = {
  id: string;
  language: string | null;
  business_type: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
};

export async function getAdminOverview() {
  const supabase = createSupabaseAdmin();

  const [leadsResult, conversationsCountResult] = await Promise.all([
    supabase.from("leads").select("*").eq("source", "momo_sales").order("created_at", { ascending: false }),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("source", "momo_sales"),
  ]);

  if (leadsResult.error) throw leadsResult.error;
  if (conversationsCountResult.error) throw conversationsCountResult.error;

  const leads = (leadsResult.data ?? []) as LeadRow[];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    leads,
    stats: {
      totalLeads: leads.length,
      newLeads: leads.filter((lead) => lead.status === "new").length,
      wonLeads: leads.filter((lead) => lead.status === "won").length,
      conversations: conversationsCountResult.count ?? 0,
      leadsToday: leads.filter((lead) => new Date(lead.created_at) >= today).length,
    },
  };
}

export async function getConversations() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("source", "momo_sales")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const conversations = (data ?? []) as ConversationRow[];
  if (!conversations.length) return [];

  const ids = conversations.map((conversation) => conversation.id);
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("conversation_id, role, content, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  const grouped = new Map<string, { count: number; lastMessage: string | null }>();
  for (const message of messages ?? []) {
    const current = grouped.get(message.conversation_id) ?? { count: 0, lastMessage: null };
    current.count += 1;
    current.lastMessage = message.content;
    grouped.set(message.conversation_id, current);
  }

  return conversations.map((conversation) => ({
    ...conversation,
    messageCount: grouped.get(conversation.id)?.count ?? 0,
    lastMessage: grouped.get(conversation.id)?.lastMessage ?? null,
  }));
}

export async function getConversation(id: string) {
  const supabase = createSupabaseAdmin();
  const [conversationResult, messagesResult, leadResult] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", id).eq("source", "momo_sales").maybeSingle(),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }),
    supabase.from("leads").select("*").eq("conversation_id", id).eq("source", "momo_sales").maybeSingle(),
  ]);

  if (conversationResult.error) throw conversationResult.error;
  if (messagesResult.error) throw messagesResult.error;
  if (leadResult.error) throw leadResult.error;

  return {
    conversation: conversationResult.data as ConversationRow | null,
    messages: (messagesResult.data ?? []) as MessageRow[],
    lead: leadResult.data as LeadRow | null,
  };
}

export async function getLead(id: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).eq("source", "momo_sales").maybeSingle();
  if (error) throw error;
  return data as LeadRow | null;
}
