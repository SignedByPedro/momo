import { openai } from "@ai-sdk/openai";
import { generateText, jsonSchema, Output } from "ai";
import { getClientAgentConfig } from "@/lib/admin/agents";
import { getClientKnowledgeStats } from "@/lib/admin/client-knowledge";
import { getOrganizationMemberUsage } from "@/lib/admin/members";
import { getOrganization } from "@/lib/admin/organizations";
import { getClientWidgetConfig } from "@/lib/admin/widgets";
import { buildPortalSupportPrompt } from "@/lib/ai/prompts/portal-support";
import { normalizeSupportReplyText } from "@/lib/ai/support-plain-text";
import { redactSupportSecrets } from "@/lib/support/secret-redaction";
import { retrievePortalSupportKnowledge } from "@/lib/knowledge/portal-support-knowledge";
import { sendNewSupportTicketNotification } from "@/lib/notifications/support-email";
import { requirePortal } from "@/lib/portal/auth";
import {
  consumeRateLimit,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  requestHasTrustedOrigin,
  validConversationId,
} from "@/lib/security/request-security";
import {
  addSupportTicketMessage,
  createSupportTicket,
  getPortalSupportTicket,
  supportTicketReference,
  type SupportContextMessage,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from "@/lib/support/tickets";

export const runtime = "nodejs";
export const maxDuration = 45;

type SupportMessage = {
  role: "user" | "assistant";
  content: string;
};

type SupportRequest = {
  messages?: SupportMessage[];
  activeTicketId?: string | null;
};

type SupportDecision = {
  reply: string;
  escalate: boolean;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  subject: string;
  summary: string;
};

const categories = new Set<SupportTicketCategory>([
  "general",
  "technical",
  "integration",
  "feature",
  "billing",
  "account",
  "privacy",
]);
const priorities = new Set<SupportTicketPriority>(["low", "normal", "high"]);

const supportDecisionSchema = jsonSchema<SupportDecision>({
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    escalate: { type: "boolean" },
    category: {
      type: "string",
      enum: ["general", "technical", "integration", "feature", "billing", "account", "privacy"],
    },
    priority: { type: "string", enum: ["low", "normal", "high"] },
    subject: { type: "string" },
    summary: { type: "string" },
  },
  required: ["reply", "escalate", "category", "priority", "subject", "summary"],
});

function validMessages(value: unknown): value is SupportMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) return false;

  let total = 0;
  let hasUser = false;
  for (const item of value) {
    if (!item || typeof item !== "object") return false;
    const message = item as Partial<SupportMessage>;
    if (message.role !== "user" && message.role !== "assistant") return false;
    if (typeof message.content !== "string") return false;
    const content = message.content.trim();
    if (!content || content.length > 4000) return false;
    total += content.length;
    if (total > 20_000) return false;
    if (message.role === "user") hasUser = true;
  }
  return hasUser;
}

function cleanJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function normalizeLanguageText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectSupportLanguage(
  messages: SupportMessage[],
  fallback: "pt" | "en",
): "pt" | "en" {
  const portugueseSignals = [
    "sou", "posso", "quero", "como", "alterar", "mudar", "remover", "eliminar",
    "apagar", "conta", "equipa", "empresa", "idioma", "lingua", "tenho", "meu",
    "minha", "nao", "sim", "obrigado", "obrigada", "preciso", "porque", "quanto",
  ];
  const englishSignals = [
    "i am", "i'm", "can i", "i want", "how", "change", "remove", "delete", "account",
    "team", "company", "language", "i have", "my", "yes", "no", "thanks", "thank you",
    "need", "why", "what", "where", "when",
  ];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const value = normalizeLanguageText(message.content);
    const ptScore = portugueseSignals.filter((signal) => value.includes(signal)).length;
    const enScore = englishSignals.filter((signal) => value.includes(signal)).length;
    if (ptScore === 0 && enScore === 0) continue;
    return enScore > ptScore ? "en" : "pt";
  }

  return fallback;
}

function isLostLeadDeletionTimingQuestion(message: string) {
  const normalized = normalizeLanguageText(message);
  return (
    /\blead\b/i.test(normalized) &&
    /\b(perdida|perdido|lost)\b/i.test(normalized) &&
    /\b(dados|data|personal)\b/i.test(normalized) &&
    /\b(apag\w*|elimin\w*|delet\w*|eras\w*|remov\w*)\b/i.test(normalized)
  );
}

function forcedEscalation(
  message: string,
  language: "pt" | "en",
): Pick<SupportDecision, "category" | "priority" | "subject" | "summary" | "reply"> | null {
  const compact = message.trim().toLowerCase();
  if (!compact) return null;

  const humanRequest =
    /\b(falar|contactar|contatar)\b.{0,30}\b(equipa|pessoa|humano|suporte)\b/i.test(compact) ||
    /\b(cria|criar|abre|abrir|envia|enviar)\b.{0,25}\b(ticket|pedido de suporte)\b/i.test(compact) ||
    /\b(speak|talk|contact)\b.{0,30}\b(team|person|human|support)\b/i.test(compact) ||
    /\b(create|open|send)\b.{0,25}\b(ticket|support request)\b/i.test(compact) ||
    /\bhuman support\b/i.test(compact);

  if (humanRequest) {
    return {
      category: "general",
      priority: "normal",
      subject: language === "en" ? "Request to speak with the team" : "Pedido para falar com a equipa",
      summary: message.slice(0, 500),
      reply:
        language === "en"
          ? "Of course. I'm sending a support request to the team with the context of this conversation."
          : "Claro. Vou enviar um pedido de suporte à equipa com o contexto desta conversa.",
    };
  }

  // Do not turn general privacy/retention questions into tickets just because
  // they mention personal data. Force a privacy ticket only for an explicit
  // request to delete personal data now, or for a concrete security/privacy
  // incident that genuinely needs team intervention.
  const normalized = normalizeLanguageText(compact);
  const deletionVerb =
    /\b(apagar|apaga|apaguem|eliminar|elimina|eliminem|remover|remove|removam|delete|deleted|erase|erased|remove|removed)\b/i.test(normalized);
  const deletionObject =
    /\b(dados|dados pessoais|informacao pessoal|personal data|data|lead|contacto|contato|contact information)\b/i.test(normalized);
  const explicitDeletionCue =
    /\b(quero|pretendo|preciso|solicito|peco|gostaria|podes|podem|por favor)\b/i.test(normalized) ||
    /\b(i want|i need|i would like|i'd like|please|can you|could you|request)\b/i.test(normalized);
  const imperativeDeletion =
    /^(?:por favor\s+)?(?:apaga|apaguem|elimina|eliminem|remove|removam)\b/i.test(normalized) ||
    /^(?:please\s+)?(?:delete|erase|remove)\b.{0,80}\b(?:my|this|these|the)\b/i.test(normalized);
  const explicitPrivacyDeletion =
    deletionVerb && deletionObject && (explicitDeletionCue || imperativeDeletion);

  const concreteSecurityOrPrivacyIncident =
    /\b(data breach|violacao de dados|conta comprometida|account compromised|acesso nao autorizado|unauthorized access|hack(?:ed|eado|eada)?|security incident|incidente de seguranca|problema de seguranca|security issue)\b/i.test(normalized);

  if (explicitPrivacyDeletion || concreteSecurityOrPrivacyIncident) {
    return {
      category: "privacy",
      priority: "high",
      subject: language === "en" ? "Privacy or security request" : "Pedido de privacidade ou segurança",
      summary: message.slice(0, 500),
      reply:
        language === "en"
          ? "This needs the team to review it directly. I'm creating a support request with the context you've shared."
          : "Isto precisa de ser analisado diretamente pela equipa. Vou criar um pedido de suporte com o contexto que partilhaste.",
    };
  }

  // Feature ideas and integration compatibility questions are intentionally not
  // forced into tickets here. Momo Support first answers from confirmed
  // documentation and asks whether the client wants the team to review an
  // unconfirmed capability. The model only escalates after that confirmation.


  return null;
}

function normalizeDecision(
  parsed: Partial<SupportDecision> | null | undefined,
  fallbackLanguage: "pt" | "en",
): SupportDecision {
  const reply = typeof parsed?.reply === "string"
    ? redactSupportSecrets(normalizeSupportReplyText(parsed.reply)).slice(0, 3000)
    : "";
  if (!reply) throw new Error("Missing reply");

  const category = categories.has(parsed?.category as SupportTicketCategory)
    ? (parsed?.category as SupportTicketCategory)
    : "general";
  const priority = priorities.has(parsed?.priority as SupportTicketPriority)
    ? (parsed?.priority as SupportTicketPriority)
    : "normal";

  return {
    reply,
    escalate: parsed?.escalate === true,
    category,
    priority,
    subject:
      typeof parsed?.subject === "string" && parsed.subject.trim()
        ? redactSupportSecrets(parsed.subject).trim().slice(0, 90)
        : fallbackLanguage === "en"
          ? "Support request"
          : "Pedido de suporte",
    summary:
      typeof parsed?.summary === "string"
        ? redactSupportSecrets(parsed.summary).trim().slice(0, 500)
        : "",
  };
}

function fallbackDecision(fallbackLanguage: "pt" | "en"): SupportDecision {
  return {
    reply:
      fallbackLanguage === "en"
        ? "I couldn't fully process that request. I can still help with questions about the Momo portal, or you can ask me to contact the team."
        : "Não consegui processar totalmente esse pedido. Posso continuar a ajudar com dúvidas sobre o portal Momo, ou podes pedir-me para contactar a equipa.",
    escalate: false,
    category: "general",
    priority: "normal",
    subject: fallbackLanguage === "en" ? "Support request" : "Pedido de suporte",
    summary: "",
  };
}

function parseDecision(text: string, fallbackLanguage: "pt" | "en"): SupportDecision {
  try {
    return normalizeDecision(
      JSON.parse(cleanJson(text)) as Partial<SupportDecision>,
      fallbackLanguage,
    );
  } catch {
    return fallbackDecision(fallbackLanguage);
  }
}

export async function POST(req: Request) {
  if (!requestHasTrustedOrigin(req)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("AI service is not configured.", 503);
  }

  const session = await requirePortal();
  const parsed = await parseJsonBody<SupportRequest>(req, 64_000);
  if (!parsed.ok) return parsed.response;
  if (!validMessages(parsed.value.messages)) {
    return jsonError("Invalid support conversation.", 400);
  }

  const rateLimit = await consumeRateLimit({
    request: req,
    namespace: "portal-support",
    subject: `user:${session.userId}`,
    limit: 30,
    windowSeconds: 10 * 60,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, "rate_limited");
  }

  const messages = parsed.value.messages;
  // Strip recognizable secrets before any Support AI/retrieval call. The
  // browser may still show what the user typed, but credentials are not
  // intentionally forwarded into model context or ticket storage.
  const safeMessages = messages.map((message) => ({
    ...message,
    content: redactSupportSecrets(message.content),
  }));
  const organizationLanguage = session.language === "en" ? "en" : "pt";
  const responseLanguage = detectSupportLanguage(safeMessages, organizationLanguage);
  const [organization, agent, widget, knowledge, memberUsage, supportKnowledge] = await Promise.all([
    getOrganization(session.organizationId),
    getClientAgentConfig(session.organizationId),
    getClientWidgetConfig(session.organizationId),
    getClientKnowledgeStats(session.organizationId),
    getOrganizationMemberUsage(session.organizationId),
    retrievePortalSupportKnowledge(safeMessages),
  ]);

  if (!organization) return jsonError("Organization not found.", 404);

  const system = buildPortalSupportPrompt({
    organization,
    role: session.role,
    agent,
    widget,
    knowledgeTotal: knowledge.total,
    knowledgeIndexed: knowledge.indexed,
    memberUsed: memberUsage.used,
    memberLimit: memberUsage.limit,
    supportKnowledgeContext: supportKnowledge.context,
    responseLanguage,
  });

  const model = openai(process.env.OPENAI_MODEL || "gpt-5.6-luna");
  const modelMessages = safeMessages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const language = responseLanguage;
  let decision: SupportDecision;

  try {
    const result = await generateText({
      model,
      system,
      messages: modelMessages,
      output: Output.object({
        schema: supportDecisionSchema,
        name: "momo_support_decision",
        description: "Momo Support reply and support-ticket escalation decision",
      }),
    });

    decision = normalizeDecision(result.output, language);
  } catch (error) {
    console.warn("[portal-support] Structured output failed; retrying with text JSON:", error);

    try {
      const retry = await generateText({
        model,
        system: `${system}\n\nRETRY FORMAT REQUIREMENT\nReturn exactly one valid JSON object matching the response contract. Do not add markdown or any text outside the object.`,
        messages: modelMessages,
      });
      decision = parseDecision(retry.text, language);
    } catch (retryError) {
      console.error("[portal-support] Support response retry failed:", retryError);
      decision = fallbackDecision(language);
    }
  }
  const latestUserMessage = [...safeMessages]
    .reverse()
    .find((message) => message.role === "user")?.content ?? "";
  const forced = forcedEscalation(latestUserMessage, language);

  // This is a documented informational policy question, not a deletion request.
  // Keep it deterministic so neither model variance nor keyword escalation can
  // create a privacy ticket for a simple question about lost-lead timing.
  if (isLostLeadDeletionTimingQuestion(latestUserMessage)) {
    decision = {
      ...decision,
      reply:
        language === "en"
          ? "Not necessarily. Marking a lead as lost means its personal lead data is no longer needed for commercial follow-up and should be removed through the applicable data process, but Momo does not currently promise that it is deleted automatically in that exact second. Non-identifying aggregate metrics may remain."
          : "Não necessariamente. Marcar uma lead como perdida significa que os dados pessoais dessa lead deixam de ser necessários para acompanhamento comercial e devem ser removidos através do processo de dados aplicável, mas o Momo não promete atualmente que sejam apagados automaticamente naquele exato segundo. Podem permanecer métricas agregadas sem dados pessoais.",
      escalate: false,
      category: "general",
      priority: "normal",
      subject: language === "en" ? "Lost lead deletion timing" : "Eliminação de lead perdida",
      summary: "",
    };
  } else if (forced && !decision.escalate) {
    decision = {
      ...decision,
      ...forced,
      escalate: true,
    };
  }

  let ticket: { id: string; reference: string } | null = null;
  if (decision.escalate) {
    const ticketMessage = latestUserMessage || decision.subject;
    const context = safeMessages.slice(-12) as SupportContextMessage[];
    const requestedTicketId =
      typeof parsed.value.activeTicketId === "string" &&
      validConversationId(parsed.value.activeTicketId.trim())
        ? parsed.value.activeTicketId.trim()
        : "";
    const existingTicket = requestedTicketId
      ? await getPortalSupportTicket(session.organizationId, requestedTicketId)
      : null;

    if (existingTicket) {
      await addSupportTicketMessage({
        ticketId: existingTicket.id,
        organizationId: session.organizationId,
        authorType: "client",
        authorUserId: session.userId,
        authorEmail: session.email,
        content: ticketMessage,
      });
      ticket = {
        id: existingTicket.id,
        reference: supportTicketReference(existingTicket.id),
      };
    } else {
      const created = await createSupportTicket({
        organizationId: session.organizationId,
        openedByUserId: session.userId,
        openedByEmail: session.email,
        subject: decision.subject,
        category: decision.category,
        priority: decision.priority,
        summary: decision.summary,
        initialMessage: ticketMessage,
        context,
      });

      ticket = { id: created.id, reference: supportTicketReference(created.id) };

      try {
        await sendNewSupportTicketNotification({
          ticketId: created.id,
          organizationName: organization.name,
          openedByEmail: session.email,
          subject: created.subject,
          summary: created.ai_summary,
          category: created.category,
          priority: created.priority,
        });
      } catch (error) {
        console.error("[support-notification] Could not send new ticket email:", error);
      }
    }
  }

  return Response.json(
    {
      reply: decision.reply,
      ticket,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
