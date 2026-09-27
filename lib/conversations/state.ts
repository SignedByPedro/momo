import type { UIMessage } from "ai";
import type {
  ConversationStage,
  ConversationState,
  LeadInfo,
  SupportedLanguage,
} from "@/types/conversation";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectLanguage(text: string): SupportedLanguage | null {
  const value = normalize(text);

  const portugueseSignals = [
    "tenho",
    "quero",
    "empresa",
    "negocio",
    "quanto",
    "preco",
    "custa",
    "clinica",
    "loja",
    "restaurante",
    "ginasio",
    "imobiliaria",
    "obrigado",
    "ola",
    "podes",
    "como funciona",
    "site",
    "proposta",
    "contacto",
    "sim",
    "sff",
  ];

  const englishSignals = [
    "i have",
    "i want",
    "company",
    "business",
    "how much",
    "price",
    "cost",
    "store",
    "clinic",
    "restaurant",
    "gym",
    "real estate",
    "thanks",
    "hello",
    "can you",
    "how does",
    "website",
    "proposal",
    "contact",
    "yes",
    "sure",
  ];

  const ptScore = portugueseSignals.filter((signal) =>
    value.includes(signal),
  ).length;
  const enScore = englishSignals.filter((signal) =>
    value.includes(signal),
  ).length;

  if (ptScore === 0 && enScore === 0) return null;
  return enScore > ptScore ? "en" : "pt";
}

const knownBusinessTypes: Array<{ patterns: RegExp[]; label: string }> = [
  {
    patterns: [
      /\bcentro\s+d[ea]\s+explicac(?:oes|ao)\b/i,
      /\bcentro\s+d[ea]\s+estudos\b/i,
      /\btutoring\s+(?:center|centre)\b/i,
    ],
    label: "centro de explicações",
  },
  {
    patterns: [/\bloja online\b/i, /\be-?commerce\b/i, /\bonline store\b/i],
    label: "loja online",
  },
  {
    patterns: [/\bclinica dentaria\b/i, /\bdental clinic\b/i, /\bdentista\b/i],
    label: "clínica dentária",
  },
  {
    patterns: [/\bclinica\b/i, /\bclinic\b/i],
    label: "clínica",
  },
  {
    patterns: [/\brestaurante\b/i, /\brestaurant\b/i, /\bcafe\b/i],
    label: "restaurante",
  },
  {
    patterns: [/\bginasio\b/i, /\bgym\b/i, /\bfitness studio\b/i],
    label: "ginásio",
  },
  {
    patterns: [/\bimobiliaria\b/i, /\breal estate\b/i],
    label: "imobiliária",
  },
  {
    patterns: [/\bhotel\b/i, /\balojamento\b/i, /\bhostel\b/i],
    label: "hotel/alojamento",
  },
  {
    patterns: [
      /\baluguer de carros\b/i,
      /\brent[- ]?a[- ]?car\b/i,
      /\bcar rental\b/i,
    ],
    label: "aluguer de carros",
  },
  {
    patterns: [/\baluguer de barcos\b/i, /\bboat rental\b/i],
    label: "aluguer de barcos",
  },
  {
    patterns: [/\bcabeleireiro\b/i, /\bhair salon\b/i, /\bsalao de beleza\b/i],
    label: "salão de beleza",
  },
];

function cleanBusinessType(value: string): string | null {
  const cleaned = value
    .replace(/[.!?][\s\S]*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  if (cleaned.length < 3) return null;
  return cleaned;
}

function detectBusinessType(text: string): string | null {
  const normalized = normalize(text);

  for (const business of knownBusinessTypes) {
    if (business.patterns.some((pattern) => pattern.test(normalized))) {
      return business.label;
    }
  }

  const genericPatterns = [
    /(?:tenho|temos)\s+(?:uma?|o)?\s*(?:empresa|negocio)?\s*(?:de|que)?\s*(.{3,90})/i,
    /(?:a minha empresa|o meu negocio)\s+(?:e|faz|vende|presta)\s+(.{3,90})/i,
    /(?:i have|we have|we run)\s+(?:an?\s+)?(?:company|business)?\s*(?:that|which|for)?\s*(.{3,90})/i,
    /(?:my company|my business)\s+(?:is|does|sells|provides)\s+(.{3,90})/i,
  ];

  for (const pattern of genericPatterns) {
    const match = normalized.match(pattern);
    const candidate = match?.[1] ? cleanBusinessType(match[1]) : null;
    if (candidate) return candidate;
  }

  return null;
}

function detectWebsite(text: string): string | null {
  const match = text.match(
    /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})(?:\/[\w\-.~:/?#[\]@!$&'()*+,;=%]*)?/i,
  );

  if (!match?.[0]) return null;

  // An email address also contains a domain. Do not confuse it with a website.
  const index = match.index ?? 0;
  if (index > 0 && text[index - 1] === "@") return null;

  return match[0];
}

/** Used only to prioritise a new website analysis in the current sales turn. */
export function websiteSharedInLatestUserTurn(messages: UIMessage[]): boolean {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  return latestUserMessage
    ? detectWebsite(messageText(latestUserMessage)) !== null
    : false;
}

function stripWebsiteValues(text: string): string {
  // Remove explicit URLs and bare domains (including their query strings) before
  // trying to identify contact details. This prevents campaign IDs, product IDs,
  // etc. inside a URL from being mistaken for phone numbers.
  return text.replace(
    /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})(?:\/[^\s]*)?/gi,
    (match, offset: number, fullText: string) => {
      // Keep domains that are part of an email address so email detection can
      // still work normally.
      if (offset > 0 && fullText[offset - 1] === "@") return match;
      return " ";
    },
  );
}

function detectEmail(text: string): string | null {
  const withoutWebsites = stripWebsiteValues(text);
  const match = withoutWebsites.match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  );
  return match?.[0] ?? null;
}

function hasExplicitPhoneContext(text: string): boolean {
  const value = normalize(text);
  const signals = [
    "telefone",
    "telemovel",
    "numero",
    "meu contacto",
    "contacto e",
    "contacto:",
    "whatsapp",
    "phone",
    "mobile",
    "my number",
    "my contact",
    "call me",
  ];

  return signals.some((signal) => value.includes(signal));
}

function detectPhone(
  text: string,
  options: { allowBarePhone?: boolean } = {},
): string | null {
  const withoutWebsites = stripWebsiteValues(text);
  const withoutEmails = withoutWebsites.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    " ",
  );
  const candidates = withoutEmails.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) continue;

    const hasInternationalPrefix = trimmed.startsWith("+");

    if (
      options.allowBarePhone ||
      hasExplicitPhoneContext(withoutEmails) ||
      hasInternationalPrefix
    ) {
      return trimmed;
    }
  }

  return null;
}

function detectLeadIntent(text: string): boolean {
  const value = normalize(text);
  const signals = [
    "quero uma proposta",
    "quero proposta",
    "pedir uma proposta",
    "receber uma proposta",
    "enviar proposta",
    "podem contactar",
    "podem me contactar",
    "quero ser contactado",
    "quero ser contactada",
    "quero avancar",
    "vamos avancar",
    "falar convosco",
    "falem comigo",
    "contactem-me",
    "contactem me",
    "como avancamos",
    "como posso avancar",
    "quero comecar",
    "get a proposal",
    "want a proposal",
    "send me a proposal",
    "get a quote",
    "want a quote",
    "contact me",
    "get in touch",
    "move forward",
    "let's move forward",
    "how do we start",
    "how can i start",
  ];

  return signals.some((signal) => value.includes(signal));
}

function isAffirmative(text: string): boolean {
  const value = normalize(text).trim().replace(/[.!?]+$/g, "");
  const affirmatives = new Set([
    "sim",
    "sff",
    "sim sff",
    "sim por favor",
    "claro",
    "pode ser",
    "vamos",
    "bora",
    "yes",
    "yes please",
    "sure",
    "okay",
    "ok",
    "sounds good",
  ]);

  return affirmatives.has(value);
}

function assistantAskedForContact(text: string): boolean {
  const value = normalize(text);
  const signals = [
    "deixa-me o teu nome",
    "deixa me o teu nome",
    "deixa-me o melhor contacto",
    "deixa me o melhor contacto",
    "melhor contacto",
    "email ou telefone",
    "email ou telemovel",
    "envia o teu contacto",
    "manda o teu contacto",
    "send me your name",
    "best way to reach you",
    "email or phone",
    "send your contact",
    "send me your contact",
  ];

  return signals.some((signal) => value.includes(signal));
}

function assistantAskedForContactOrProposal(text: string): boolean {
  const value = normalize(text);
  const signals = [
    "deixa-me o teu nome",
    "deixa me o teu nome",
    "melhor contacto",
    "email ou telefone",
    "entramos em contacto",
    "falar contigo",
    "preparar uma proposta",
    "receber uma proposta",
    "send me your name",
    "best way to reach you",
    "email or phone",
    "we'll get in touch",
    "we will get in touch",
    "prepare a proposal",
    "receive a proposal",
  ];

  return signals.some((signal) => value.includes(signal));
}

function detectLeadIntentFromConversation(messages: UIMessage[]): boolean {
  const latestUserIndex = [...messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find(({ message }) => message.role === "user")?.index;

  if (latestUserIndex === undefined) return false;

  const latestUserText = messageText(messages[latestUserIndex]);
  if (!isAffirmative(latestUserText)) return false;

  for (let index = latestUserIndex - 1; index >= 0; index -= 1) {
    const previous = messages[index];
    if (previous.role === "assistant") {
      return assistantAskedForContactOrProposal(messageText(previous));
    }
  }

  return false;
}

const invalidNameWords = new Set([
  "um",
  "uma",
  "o",
  "a",
  "dono",
  "dona",
  "proprietario",
  "proprietaria",
  "gerente",
  "gestor",
  "gestora",
  "responsavel",
  "dentista",
  "medico",
  "medica",
  "cliente",
  "interessado",
  "interessada",
  "owner",
  "manager",
  "director",
  "founder",
  "customer",
  "interested",
  "from",
  "here",
]);

// Defensive check for short acknowledgement fragments that can remain when a
// visitor answers a contact request before giving their real name. These should
// never become a lead name even if punctuation or phrasing is unusual.
const invalidNamePhrases = new Set([
  "claro",
  "claro que sim",
  "que sim",
  "sim",
  "sim por favor",
  "com certeza",
  "sem problema",
  "perfeito",
  "ok",
  "okay",
  "sure",
  "yes",
  "yes please",
  "of course",
  "no problem",
  "perfect",
]);

function cleanNameCandidate(raw: string): string | null {
  const firstSegment = raw
    .split(/[,;.!?\n]|\s+(?:e|and|mas|but|tenho|temos|i have|we have|da|do)\s+/i)[0]
    ?.replace(/^\s*(?:o|a)\s+/i, "")
    .trim();

  if (!firstSegment || firstSegment.length < 2 || firstSegment.length > 50) {
    return null;
  }

  if (
    !/^[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2}$/u.test(firstSegment)
  ) {
    return null;
  }

  const normalizedCandidate = normalize(firstSegment).replace(/\s+/g, " ").trim();
  if (invalidNamePhrases.has(normalizedCandidate)) return null;

  const words = normalizedCandidate.split(/\s+/);
  if (words.some((word) => invalidNameWords.has(word))) return null;

  return firstSegment;
}

function detectExplicitName(text: string): string | null {
  const patterns = [
    /(?:chamo-me|chamo me|o meu nome (?:e|é)|meu nome (?:e|é)|eu sou|sou o|sou a|sou)\s+(.{2,60})/iu,
    /(?:my name is|i am|i'm|im)\s+(.{2,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1] ? cleanNameCandidate(match[1]) : null;
    if (candidate) return candidate;
  }

  return null;
}

function stripContactReplyPreamble(text: string): string {
  let value = text.trim();

  // Visitors often answer a contact request with a short acknowledgement first,
  // e.g. "Claro! Joana, 912..." or "Sure — John, john@example.com".
  // Those acknowledgements are conversational glue, not the visitor's name.
  const preamble = /^(?:(?:claro(?:\s+que\s+sim)?|sim(?:\s*,?\s*claro)?(?:\s+por\s+favor)?|sff|ok(?:ay)?|perfeito|com\s+certeza|sem\s+problema|pode\s+ser|combinado|certamente|sure|yes(?:\s*,?\s*sure)?(?:\s+please)?|of\s+course|perfect|no\s+problem|absolutely)\b[\s,;:!?.–—-]*)+/iu;
  value = value.replace(preamble, "").trim();

  return value;
}

function detectNameFromContactMessage(
  text: string,
  options: { allowBarePhone?: boolean } = {},
): string | null {
  const hasContact = Boolean(
    detectEmail(text) || detectPhone(text, options),
  );
  if (!hasContact) return null;

  const withoutPreamble = stripContactReplyPreamble(text);
  const firstPart = withoutPreamble.split(/[,;|\n]/)[0]?.trim() ?? "";
  return cleanNameCandidate(firstPart);
}

function deriveLeadInfo(messages: UIMessage[]): LeadInfo {
  let explicitName: string | null = null;
  let inferredName: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let previousAssistantAskedForContact = false;

  for (const message of messages) {
    const text = messageText(message);

    if (message.role === "assistant") {
      previousAssistantAskedForContact = assistantAskedForContact(text);
      continue;
    }

    if (message.role !== "user") continue;

    explicitName = detectExplicitName(text) ?? explicitName;
    email = detectEmail(text) ?? email;

    const detectedPhone = detectPhone(text, {
      allowBarePhone: previousAssistantAskedForContact,
    });
    phone = detectedPhone ?? phone;

    inferredName =
      detectNameFromContactMessage(text, {
        allowBarePhone: previousAssistantAskedForContact,
      }) ?? inferredName;

    // A contact request applies to the next user turn only. If the visitor did
    // not provide a contact, Momo will ask again if needed on a later turn.
    previousAssistantAskedForContact = false;
  }

  return {
    // A name explicitly introduced by the visitor is more reliable than a name
    // inferred from the first token of a later contact message.
    name: explicitName ?? inferredName,
    email,
    phone,
    hasContact: Boolean(email || phone),
  };
}

export function deriveConversationState(
  messages: UIMessage[],
  preferredLanguage?: SupportedLanguage,
): ConversationState {
  const userMessages = messages.filter((message) => message.role === "user");
  let language: SupportedLanguage = preferredLanguage ?? "pt";
  if (!preferredLanguage) {
    for (let index = userMessages.length - 1; index >= 0; index -= 1) {
      const detected = detectLanguage(messageText(userMessages[index]));
      if (detected) {
        language = detected;
        break;
      }
    }
  }

  let businessType: string | null = null;
  let website: string | null = null;
  let leadIntent = false;

  for (const message of userMessages) {
    const text = messageText(message);
    businessType = detectBusinessType(text) ?? businessType;
    website = detectWebsite(text) ?? website;
    leadIntent = detectLeadIntent(text) || leadIntent;
  }

  leadIntent = detectLeadIntentFromConversation(messages) || leadIntent;

  const lead = deriveLeadInfo(messages);

  let stage: ConversationStage = "discovery";
  if (businessType) stage = "business_known";
  if (website) stage = "website_received";
  if (leadIntent && !lead.hasContact) stage = "lead_requested";
  if (lead.hasContact) stage = "lead_ready";

  return {
    mode:
      stage === "lead_requested" || stage === "lead_ready"
        ? "lead_capture"
        : "sales",
    stage,
    language,
    businessType,
    website,
    lead,
  };
}
