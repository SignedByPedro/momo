import type { UiLanguage } from "@/lib/i18n/ui";

export type DemoLanguage = UiLanguage;

export type DemoPhase =
  | "awaiting_name"
  | "exploring"
  | "awaiting_price"
  | "awaiting_interest"
  | "awaiting_email"
  | "free";

export const QUESTION_IDS = ["what", "purpose", "why"] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export const PRICE_BANDS = ["50-99", "100-149", "150-200"] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];

export type DemoTranscriptTurn = {
  role: "user" | "assistant";
  text: string;
  at: string;
};

export type DemoSuggestion = {
  id: string;
  label: string;
};

export type DemoView = {
  sessionId: string;
  phase: DemoPhase;
  language: DemoLanguage;
  visitorName: string | null;
  suggestions: DemoSuggestion[];
  inputMode: "name" | "email" | "free" | "none";
  transcript: DemoTranscriptTurn[];
  freeConversationId: string | null;
};

export type DemoSessionState = {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  language: DemoLanguage;
  phase: DemoPhase;
  visitorName: string | null;
  questionsSeen: QuestionId[];
  priceBand: PriceBand | null;
  interested: boolean | null;
  email: string | null;
  transcript: DemoTranscriptTurn[];
  freeConversationId: string | null;
};

const copy = {
  pt: {
    heroLead: "Olá, este é o ",
    heroAccent: "Momo",
    nudge: "Carrega aqui",
    greeting: "Olá, eu sou o Momo, e tu, como te chamas?",
    nameRetry: "Não apanhei o nome. Como te chamas?",
    namePlaceholder: "O teu nome",
    afterName: (name: string) =>
      `Prazer, ${name}. Escolhe uma pergunta — explico-te o que é o Momo, para que serve e porque pode ser útil.`,
    questions: {
      what: "O que é o Momo?",
      purpose: "Para que serve?",
      why: "Porque é que me seria útil?",
    },
    answers: {
      what: "O Momo é um assistente de IA para organizações. Fica no site e conversa com quem procura a empresa, em português ou inglês, usando a informação dessa organização.",
      purpose:
        "Serve para responder a perguntas frequentes, explicar o que a empresa oferece, recolher um contacto quando alguém quer mesmo ser contactado, e passar à equipa o que precisa de uma pessoa. Não confirma marcações, encomendas ou stock se isso não estiver mesmo ligado.",
      why: "Quem chega ao site pode ser atendido na hora, a qualquer hora, nas perguntas que se repetem. A equipa fica com o histórico e com os contactos que valem acompanhamento.",
    },
    priceQuestion:
      "Se o Momo tratasse destas conversas na tua empresa, que valor mensal te parecia justo?",
    interestQuestion: "E ficavas interessado em usar o Momo?",
    yes: "Sim",
    no: "Ainda não",
    emailAsk: "Deixa o teu email. Assim a equipa pode falar contigo.",
    emailRetry: "Esse email não parece válido. Podes confirmá-lo?",
    emailPlaceholder: "O teu email",
    handoffYes: (name: string) =>
      `Obrigado, ${name}. Se quiseres, experimenta agora o chat à vontade e pergunta o que quiseres sobre o Momo.`,
    handoffNo: (name: string) =>
      `Percebo, ${name}. Se quiseres na mesma, experimenta o chat e pergunta o que quiseres sobre o Momo.`,
    choose: "Escolhe uma opção",
    freePlaceholder: "Pergunta o que quiseres sobre o Momo...",
    phases: {
      awaiting_name: "À espera do nome",
      exploring: "A explorar",
      awaiting_price: "À espera do valor",
      awaiting_interest: "À espera do interesse",
      awaiting_email: "À espera do email",
      free: "Chat livre",
    },
  },
  en: {
    heroLead: "Hi, this is ",
    heroAccent: "Momo",
    nudge: "Tap here",
    greeting: "Hi, I'm Momo, and you, what's your name?",
    nameRetry: "I didn't catch your name. What should I call you?",
    namePlaceholder: "Your name",
    afterName: (name: string) =>
      `Nice to meet you, ${name}. Pick a question — I'll explain what Momo is, what it's for, and why it can be useful.`,
    questions: {
      what: "What is Momo?",
      purpose: "What is it for?",
      why: "Why would it be useful to me?",
    },
    answers: {
      what: "Momo is an AI assistant for organizations. It lives on the website and talks with the people who reach out, in Portuguese or English, using that organization's information.",
      purpose:
        "It answers common questions, explains what the organization offers, collects a contact when someone actually wants to be reached, and passes to the team anything that needs a person. It does not confirm bookings, orders or stock unless that connection really exists.",
      why: "People who arrive on the site can be answered immediately, at any hour, on the questions that repeat. The team keeps the history and the contacts that are worth following up.",
    },
    priceQuestion:
      "If Momo handled these conversations for your organization, what monthly price would feel fair?",
    interestQuestion: "Would you be interested in using Momo?",
    yes: "Yes",
    no: "Not yet",
    emailAsk: "Leave your email and the team can talk to you.",
    emailRetry: "That email doesn't look valid. Can you check it?",
    emailPlaceholder: "Your email",
    handoffYes: (name: string) =>
      `Thanks, ${name}. If you want, try the chat freely now and ask whatever you like about Momo.`,
    handoffNo: (name: string) =>
      `I understand, ${name}. If you still want to, try the chat and ask whatever you like about Momo.`,
    choose: "Choose an option",
    freePlaceholder: "Ask whatever you like about Momo...",
    phases: {
      awaiting_name: "Waiting for a name",
      exploring: "Exploring",
      awaiting_price: "Waiting for a price",
      awaiting_interest: "Waiting for interest",
      awaiting_email: "Waiting for an email",
      free: "Free chat",
    },
  },
} as const;

export function demoCopy(language: DemoLanguage) {
  return copy[language];
}

export function isQuestionId(value: unknown): value is QuestionId {
  return QUESTION_IDS.includes(value as QuestionId);
}

export function isPriceBand(value: unknown): value is PriceBand {
  return PRICE_BANDS.includes(value as PriceBand);
}

export function isDemoPhase(value: unknown): value is DemoPhase {
  return (
    value === "awaiting_name" ||
    value === "exploring" ||
    value === "awaiting_price" ||
    value === "awaiting_interest" ||
    value === "awaiting_email" ||
    value === "free"
  );
}

export function cleanName(value: string) {
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 1 || cleaned.length > 80) return null;
  if (!/\p{L}/u.test(cleaned)) return null;
  return cleaned;
}

export function cleanEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 180) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export function priceLabel(band: PriceBand) {
  if (band === "50-99") return "50–99 €";
  if (band === "100-149") return "100–149 €";
  return "150–200 €";
}

export function demoPhaseLabel(phase: DemoPhase, language: DemoLanguage) {
  return copy[language].phases[phase];
}

export function suggestionsFor(session: DemoSessionState): DemoSuggestion[] {
  const text = copy[session.language];

  if (session.phase === "exploring") {
    return QUESTION_IDS.filter((id) => !session.questionsSeen.includes(id)).map((id) => ({
      id,
      label: text.questions[id],
    }));
  }

  if (session.phase === "awaiting_price") {
    return PRICE_BANDS.map((band) => ({ id: band, label: priceLabel(band) }));
  }

  if (session.phase === "awaiting_interest") {
    return [
      { id: "yes", label: text.yes },
      { id: "no", label: text.no },
    ];
  }

  return [];
}

export function toDemoView(session: DemoSessionState): DemoView {
  const inputMode =
    session.phase === "awaiting_name"
      ? "name"
      : session.phase === "awaiting_email"
        ? "email"
        : session.phase === "free"
          ? "free"
          : "none";

  return {
    sessionId: session.id,
    phase: session.phase,
    language: session.language,
    visitorName: session.visitorName,
    suggestions: suggestionsFor(session),
    inputMode,
    transcript: session.transcript,
    freeConversationId: session.freeConversationId,
  };
}
