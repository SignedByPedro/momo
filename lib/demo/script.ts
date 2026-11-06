import type { UiLanguage } from "@/lib/i18n/ui";

export type DemoLanguage = UiLanguage;

export type DemoPhase =
  | "awaiting_name"
  | "exploring"
  | "awaiting_price"
  | "awaiting_interest"
  | "awaiting_email"
  | "free";

export const QUESTION_IDS = ["purpose", "why", "what"] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export const PRICE_BANDS = ["25-49", "50-99", "100-149", "150-200"] as const;
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
    afterName: (name: string) => `Prazer, ${name}. O que queres saber sobre mim?`,
    questions: {
      purpose: "Para que serves?",
      why: "Porque é que isso seria útil para mim?",
      what: "Então, no fundo, és um chatbot?",
    },
    answers: {
      purpose:
        "Eu sou um serviço de IA para o teu negócio que automatiza conversas com clientes e tarefas repetitivas de atendimento. Posso responder a perguntas com informação da tua empresa, orientar os teus visitantes, captar informação de potenciais novos clientes, responder a dúvidas e encaminhar situações mais complexas para a tua equipa. Tudo isto de forma automática, sem complicações e sem atritos, poupando o teu tempo.",
      why: "Ser-te-ia útil para reduzir o tempo gasto em tarefas repetitivas e garantir que os teus clientes obtêm respostas mesmo quando tu ou a tua equipa não estão disponíveis. Eu também consigo orientar os visitantes do teu site, recolher contactos de potenciais clientes e encaminhar para a equipa os casos que exigem atenção humana. Resumindo, mantenho o teu negócio a correr de forma eficiente, mesmo quando não tens disponibilidade.",
      what: "Sou muito mais do que isso. Funciono com inteligência artificial, por isso não respondo de forma básica nem com textos pré-formatados. Para além disso, vais ter um portal onde podes moldar a minha linguagem, dar-me o conhecimento que quiseres sobre o teu negócio e até personalizar a minha aparência, tanto na janela de chat como no botão que aparece no teu website. Sou um assistente do teu negócio. Faço parte da tua equipa.",
    },
    priceQuestion:
      "Se eu trabalhasse contigo, que valor mensal te pareceria justo?",
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
      awaiting_price: "À espera do valor",
      awaiting_interest: "À espera do interesse",
      awaiting_email: "À espera do contacto",
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
    afterName: (name: string) => `Nice to meet you, ${name}. What do you want to know about me?`,
    questions: {
      purpose: "What are you for?",
      why: "Why would that be useful to me?",
      what: "So, basically, you're a chatbot?",
    },
    answers: {
      purpose:
        "I am an AI service for your business that automates customer conversations and repetitive support tasks. I can answer questions with your company's information, guide your visitors, capture details from potential new customers, handle common doubts and pass more complex situations to your team. All of that automatically, without friction, so you get your time back.",
      why: "It would be useful to cut the time spent on repetitive questions and make sure your customers get answers even when you or your team are not available. I can also guide the people who arrive on your site, collect contacts from potential customers and hand the team the cases that need a person. In short, I keep your business moving even when you are not free.",
      what: "I'm much more than that. I run on artificial intelligence, so I don't answer in a basic or pre-formatted way. On top of that, you'll get a portal where you can shape my language, give me the knowledge you want about your business, and even personalise how I look — both in the chat window and on the button that appears on your website. I'm an assistant for your business. I'm part of your team.",
    },
    priceQuestion:
      "If Momo handled these conversations for your business, what monthly price would feel fair?",
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

export function cleanPhone(value: string) {
  const compact = value.trim().replace(/[().\-\s]/g, "");
  if (!/^\+?\d{8,15}$/.test(compact)) return null;
  return compact;
}

export function cleanContact(value: string) {
  return cleanEmail(value) ?? cleanPhone(value);
}

export function priceLabel(band: PriceBand) {
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
