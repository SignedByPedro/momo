import type { UIMessage } from "ai";
import type { PublicWidgetBundle } from "@/lib/widget/public-widget";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stripWebsites(text: string) {
  return text.replace(
    /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})(?:\/[^\s]*)?/gi,
    (match, offset: number, fullText: string) => {
      if (offset > 0 && fullText[offset - 1] === "@") return match;
      return " ";
    },
  );
}

function detectEmail(text: string) {
  const match = stripWebsites(text).match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  );
  return match?.[0] ?? null;
}

function assistantAskedForContact(text: string) {
  const value = normalize(text);
  const signals = [
    "email ou telefone",
    "email ou telemovel",
    "melhor contacto",
    "teu contacto",
    "seu contacto",
    "telefone para contacto",
    "numero de telefone",
    "deixa-me o teu nome",
    "deixa me o teu nome",
    "como podemos contactar",
    "email or phone",
    "best contact",
    "your contact",
    "phone number",
    "send your contact",
    "send me your contact",
    "how can we reach you",
    "best way to reach you",
  ];
  return signals.some((signal) => value.includes(signal));
}

function detectPhone(text: string, allowBare: boolean) {
  const withoutWebsites = stripWebsites(text).replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    " ",
  );
  const candidates = withoutWebsites.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) continue;

    const value = normalize(withoutWebsites);
    const explicit = [
      "telefone",
      "telemovel",
      "numero",
      "contacto",
      "contato",
      "whatsapp",
      "phone",
      "mobile",
      "my number",
    ].some((signal) => value.includes(signal));

    if (allowBare || explicit || trimmed.startsWith("+")) return trimmed;
  }

  return null;
}

function cleanName(value: string) {
  const candidate = value
    .replace(
      /^(?:(?:obrigad[oa]|thanks|thank you|claro|sim(?:\s+por\s+favor)?|sff|ok(?:ay)?|perfeito|com\s+certeza|sem\s+problema|sure|yes(?:\s+please)?|of\s+course|perfect|no\s+problem)\b[\s,;:!?.–—-]*)+/iu,
      "",
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, " ")
    .replace(/\b(?:o meu|meu|my)\s+(?:email|e-mail|contacto|contato|phone|telefone)\s*(?:e|is|:)?/gi, " ")
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (candidate.length < 2 || candidate.length > 60) return null;
  if (/\d/.test(candidate)) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(candidate)) return null;

  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length > 4) return null;

  const blocked = new Set([
    "sim",
    "yes",
    "ok",
    "okay",
    "obrigado",
    "obrigada",
    "thanks",
    "hello",
    "ola",
    "contacto",
    "contato",
    "telefone",
    "phone",
    "email",
  ]);
  if (words.every((word) => blocked.has(normalize(word)))) return null;

  return candidate
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function detectExplicitName(text: string) {
  const patterns = [
    /(?:^|\b)(?:chamo-me|chamo me|o meu nome e|o meu nome é|sou)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60})/i,
    /(?:^|\b)(?:my name is|i am|i'm)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = cleanName(match[1].split(/[,;.!?\n]/)[0]);
      if (name) return name;
    }
  }
  return null;
}

function deriveVisitorDetails(messages: UIMessage[]) {
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "user") continue;

    const text = messageText(message);
    if (!text) continue;

    name = detectExplicitName(text) ?? name;
    email = detectEmail(text) ?? email;

    let previousAssistant = "";
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (messages[cursor].role === "assistant") {
        previousAssistant = messageText(messages[cursor]);
        break;
      }
    }

    const allowBarePhone = assistantAskedForContact(previousAssistant);
    phone = detectPhone(text, allowBarePhone) ?? phone;

    if ((email || phone) && !name) {
      name = cleanName(text) ?? name;
    }
  }

  return { name, email, phone };
}

export async function persistWidgetIncomingTurn(args: {
  conversationId: string;
  messages: UIMessage[];
  bundle: PublicWidgetBundle;
}) {
  const { conversationId, messages, bundle } = args;
  const supabase = createSupabaseAdmin();
  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  const latestContent = latestUser ? messageText(latestUser) : "";
  const contactCaptureEnabled = bundle.agent.contact_capture_mode !== "disabled";
  const visitor = contactCaptureEnabled
    ? deriveVisitorDetails(messages)
    : { name: null, email: null, phone: null };
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id, organization_id, source, visitor_name")
    .eq("id", conversationId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (
      existing.source !== "widget" ||
      existing.organization_id !== bundle.organization.id
    ) {
      throw new Error("Conversation ownership mismatch.");
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        language: bundle.organization.primary_language,
        business_type: bundle.organization.business_type,
        website: bundle.organization.website,
        visitor_name: visitor.name ?? existing.visitor_name ?? null,
        updated_at: now,
      })
      .eq("id", conversationId);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase.from("conversations").insert({
      id: conversationId,
      organization_id: bundle.organization.id,
      source: "widget",
      language: bundle.organization.primary_language,
      business_type: bundle.organization.business_type,
      website: bundle.organization.website,
      visitor_name: visitor.name,
      created_at: now,
      updated_at: now,
    });

    if (insertError) throw insertError;
  }

  if (latestContent) {
    const { error: messageError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: latestContent,
    });
    if (messageError) throw messageError;
  }

  if (contactCaptureEnabled && (visitor.email || visitor.phone)) {
    const { data: currentLead, error: leadLookupError } = await supabase
      .from("leads")
      .select("id, name, email, phone")
      .eq("conversation_id", conversationId)
      .limit(1)
      .maybeSingle();

    if (leadLookupError) throw leadLookupError;

    const leadData = {
      conversation_id: conversationId,
      organization_id: bundle.organization.id,
      source: "widget",
      name: visitor.name ?? currentLead?.name ?? null,
      email: visitor.email ?? currentLead?.email ?? null,
      phone: visitor.phone ?? currentLead?.phone ?? null,
      website: bundle.organization.website,
      business_type: bundle.organization.business_type,
      updated_at: now,
    };

    if (currentLead?.id) {
      const { error: updateLeadError } = await supabase
        .from("leads")
        .update(leadData)
        .eq("id", currentLead.id);
      if (updateLeadError) throw updateLeadError;
    } else {
      const { error: insertLeadError } = await supabase.from("leads").insert({
        ...leadData,
        status: "new",
      });
      if (insertLeadError) throw insertLeadError;
    }
  }
}

export async function persistWidgetAssistantMessage(args: {
  conversationId: string;
  content: string;
}) {
  const { conversationId, content } = args;
  if (!content.trim()) return;

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: content.trim(),
  });
  if (messageError) throw messageError;

  const { error: conversationError } = await supabase
    .from("conversations")
    .update({ updated_at: now })
    .eq("id", conversationId);
  if (conversationError) throw conversationError;
}
