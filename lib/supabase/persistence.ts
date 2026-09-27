import type { UIMessage } from "ai";
import type { ConversationState } from "@/types/conversation";
import { sendNewMomoLeadNotification } from "@/lib/notifications/lead-email";
import { createSupabaseAdmin } from "./admin";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function persistIncomingTurn(args: {
  conversationId: string;
  messages: UIMessage[];
  state: ConversationState;
}) {
  const { conversationId, messages, state } = args;
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id, organization_id, source")
    .eq("id", conversationId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.source !== "momo_sales" || existing.organization_id !== null) {
      throw new Error("Conversation ownership mismatch.");
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        language: state.language,
        business_type: state.businessType,
        website: state.website,
        updated_at: now,
      })
      .eq("id", conversationId)
      .eq("source", "momo_sales")
      .is("organization_id", null);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase.from("conversations").insert({
      id: conversationId,
      organization_id: null,
      source: "momo_sales",
      language: state.language,
      business_type: state.businessType,
      website: state.website,
      created_at: now,
      updated_at: now,
    });

    if (insertError) throw insertError;
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (latestUserMessage) {
    const content = messageText(latestUserMessage);

    if (content) {
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content,
      });

      if (messageError) throw messageError;
    }
  }

  if (state.lead.hasContact) {
    await persistLead({ conversationId, state });
  }
}

export async function persistAssistantMessage(args: {
  conversationId: string;
  content: string;
}) {
  const { conversationId, content } = args;
  if (!content.trim()) return;

  const supabase = createSupabaseAdmin();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("source", "momo_sales")
    .is("organization_id", null)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("Conversation ownership mismatch.");

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: content.trim(),
  });

  if (error) throw error;
}

async function persistLead(args: {
  conversationId: string;
  state: ConversationState;
}) {
  const { conversationId, state } = args;
  const supabase = createSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from("leads")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("source", "momo_sales")
    .is("organization_id", null)
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;

  const leadData = {
    conversation_id: conversationId,
    organization_id: null,
    source: "momo_sales",
    name: state.lead.name,
    email: state.lead.email,
    phone: state.lead.phone,
    website: state.website,
    business_type: state.businessType,
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("leads")
      .update(leadData)
      .eq("id", existing.id)
      .eq("source", "momo_sales")
      .is("organization_id", null);

    if (updateError) throw updateError;
    return;
  }

  const { data: insertedLead, error: insertError } = await supabase
    .from("leads")
    .insert(leadData)
    .select("id")
    .single();

  if (insertError) throw insertError;

  // A notification failure must never block the visitor's conversation or lose
  // the lead that was already persisted successfully.
  try {
    await sendNewMomoLeadNotification({
      leadId: insertedLead.id,
      conversationId,
      name: state.lead.name,
      email: state.lead.email,
      phone: state.lead.phone,
      website: state.website,
      businessType: state.businessType,
    });
  } catch (error) {
    console.error("[lead-notification] Failed to send new lead email:", error);
  }
}
