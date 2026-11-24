import type { UiLanguage } from "@/lib/i18n/ui";

export type DemoLanguage = UiLanguage;

export type DemoPhase =
  | "awaiting_name"
  | "exploring"
  | "awaiting_company_size"
  | "awaiting_price"
  | "awaiting_interest"
  | "awaiting_email"
  | "free";

export const QUESTION_IDS = ["purpose", "why", "what"] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export const COMPANY_SIZE_BANDS = ["1-5", "6-20", "21-50", "51-200", "201+"] as const;
export type CompanySizeBand = (typeof COMPANY_SIZE_BANDS)[number];

export const PRICE_BANDS = ["0-25", "25-49", "50-99", "100-149", "150-200"] as const;
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
  companySize: CompanySizeBand | null;
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
    heroInvite: "VAMOS FALAR?",
    nudge: "Carrega aqui",
    greeting: "Olá, eu sou o Momo, e tu, como te chamas?",
    nameRetry: "Não apanhei o nome. Como te chamas?",
    namePlaceholder: "O teu nome",
    afterName: (name: string) => `Prazer, ${name}. O que queres saber sobre mim?`,
    questions: {
      purpose: "Para que serves?",
      why: "Porque é que isso seria útil para mim?",
      what: "Então, no fundo, és um chatbot?",
    },
    answers: {
      purpose:
        "Sou um serviço de IA para o teu negócio: automatizo conversas com clientes e tarefas repetitivas de atendimento.\n\nConsigo:\n• responder com informação da tua empresa\n• orientar os visitantes do site\n• captar contactos de potenciais clientes\n• esclarecer dúvidas do dia a dia\n• encaminhar casos mais complexos para a tua equipa\n\nTudo automático, sem atritos e para poupar o teu tempo.",
      why: "Ser-te-ia útil para te libertar a ti e à tua equipa de perguntas repetitivas e garantir respostas mesmo quando ninguém está disponível.\n\nNa prática:\n• oriento quem chega ao teu site\n• recolho contactos de potenciais clientes\n• passo à equipa só o que precisa de atenção humana\n\nResumindo: o negócio continua a correr, mesmo quando tu não tens disponibilidade.",
      what: "Sou muito mais do que isso.\n\nFunciono com inteligência artificial, por isso não respondo de forma básica nem com textos pré-formatados.\n\nNo portal podes:\n• moldar a minha linguagem\n• dar-me o conhecimento do teu negócio\n• personalizar a aparência do chat e do botão no website\n\nSou um assistente do teu negócio. Faço parte da tua equipa.",
    },
    companySizeQuestion: "Quantas pessoas trabalham na tua empresa?",
    priceQuestion:
      "Trabalhando de forma integrada na tua equipa, que valor estarias disposto a investir mensalmente?",
    interestQuestion: "E ficavas interessado em usar o Momo?",
    yes: "Sim",
    no: "Não estou interessado",
    emailAsk: "Se ficaste interessado ou se queres saber mais, deixa o teu contacto de email ou número de telefone.",
    emailRetry: "Esse contacto não parece válido. Podes deixar um email ou um número de telefone?",
    emailPlaceholder: "O teu email ou telefone",
    handoffYes: (name: string) =>
      `Obrigado, ${name}. Se quiseres, experimenta agora o chat à vontade e pergunta o que quiseres sobre mim.`,
    handoffNo: (name: string) =>
      `Percebo, ${name}. Se quiseres na mesma, experimenta o chat e pergunta o que quiseres sobre mim.`,
    choose: "Escolhe uma opção",
    freePlaceholder: "Pergunta o que quiseres sobre o Momo...",
    phases: {
      awaiting_name: "À espera do nome",
      exploring: "A explorar",
      awaiting_company_size: "À espera da dimensão",
      awaiting_price: "À espera do valor",
      awaiting_interest: "À espera do interesse",
      awaiting_email: "À espera do contacto",
      free: "Chat livre",
    },
  },
  en: {
    heroLead: "Hi, this is ",
    heroAccent: "Momo",
    heroInvite: "SHALL WE TALK?",
    nudge: "Tap here",
    greeting: "Hi, I'm Momo, and you, what's your name?",
    nameRetry: "I didn't catch your name. What should I call you?",
    namePlaceholder: "Your name",
    afterName: (name: string) => `Nice to meet you, ${name}. What do you want to know about me?`,
    questions: {
      purpose: "What are you for?",
      why: "Why would that be useful to me?",
      what: "So, basically, you're a chatbot?",
    },
    answers: {
      purpose:
        "I'm an AI service for your business: I automate customer conversations and repetitive support tasks.\n\nI can:\n• answer with your company's information\n• guide people on your site\n• capture contacts from potential customers\n• handle day-to-day questions\n• pass more complex cases to your team\n\nAll automatically, without friction — so you get time back.",
      why: "It frees your team from repetitive questions and keeps answers flowing even when nobody is available.\n\nIn practice:\n• I guide people who land on your site\n• I collect contacts from potential customers\n• I hand your team only what needs a person\n\nIn short: the business keeps moving even when you're not free.",
      what: "I'm much more than that.\n\nI run on artificial intelligence, so I don't answer in a basic or pre-formatted way.\n\nIn the portal you can:\n• shape my language\n• give me knowledge about your business\n• personalise the chat and the button on your website\n\nI'm an assistant for your business. I'm part of your team.",
    },
    companySizeQuestion: "How many people work at your company?",
    priceQuestion:
      "Working as part of your team, what monthly amount would you be willing to invest?",
    interestQuestion: "Would you be interested in using Momo?",
    yes: "Yes",
    no: "I'm not interested",
    emailAsk: "If you're interested or want to know more, leave your email or phone number.",
    emailRetry: "That contact doesn't look valid. You can leave an email or a phone number.",
    emailPlaceholder: "Your email or phone",
    handoffYes: (name: string) =>
      `Thanks, ${name}. If you want, try the chat freely now and ask whatever you like about me.`,
    handoffNo: (name: string) =>
      `I understand, ${name}. If you still want to, try the chat and ask whatever you like about me.`,
    choose: "Choose an option",
    freePlaceholder: "Ask whatever you like about Momo...",
    phases: {
      awaiting_name: "Waiting for a name",
      exploring: "Exploring",
      awaiting_company_size: "Waiting for company size",
      awaiting_price: "Waiting for a price",
      awaiting_interest: "Waiting for interest",
      awaiting_email: "Waiting for a contact",
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

export function isCompanySizeBand(value: unknown): value is CompanySizeBand {
  return COMPANY_SIZE_BANDS.includes(value as CompanySizeBand);
}

export function isPriceBand(value: unknown): value is PriceBand {
  return PRICE_BANDS.includes(value as PriceBand);
}

export function isDemoPhase(value: unknown): value is DemoPhase {
  return (
    value === "awaiting_name" ||
    value === "exploring" ||
    value === "awaiting_company_size" ||
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

export function cleanPhone(value: string) {
  const compact = value.trim().replace(/[().\-\s]/g, "");
  if (!/^\+?\d{8,15}$/.test(compact)) return null;
  return compact;
}

export function cleanContact(value: string) {
  return cleanEmail(value) ?? cleanPhone(value);
}

export function companySizeLabel(band: CompanySizeBand) {
  if (band === "201+") return "201+";
  if (band === "1-5") return "1–5";
  if (band === "6-20") return "6–20";
  if (band === "21-50") return "21–50";
  return "51–200";
}

export function priceLabel(band: PriceBand) {
  if (band === "0-25") return "0–25 €";
  if (band === "25-49") return "25–49 €";
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
    const next = QUESTION_IDS.find((id) => !session.questionsSeen.includes(id));
    if (!next) return [];
    return [{ id: next, label: text.questions[next] }];
  }

  if (session.phase === "awaiting_company_size") {
    return COMPANY_SIZE_BANDS.map((band) => ({ id: band, label: companySizeLabel(band) }));
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

  if (session.phase === "awaiting_email") {
    return [{ id: "no", label: text.no }];
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
