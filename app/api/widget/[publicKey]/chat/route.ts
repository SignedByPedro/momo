import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildClientAgentSystemPrompt } from "@/lib/ai/prompts/client-agent";
import {
  clientInternalKnowledgePromptContext,
  clientKnowledgePromptContext,
  getPublishedInternalClientKnowledge,
  retrieveClientKnowledge,
} from "@/lib/knowledge/client-knowledge";
import {
  chatResponseHeaders,
  consumeRateLimit,
  getChatRequestIssue,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  requestHasTrustedOrigin,
  validConversationId,
} from "@/lib/security/request-security";
import {
  persistWidgetAssistantMessage,
  persistWidgetIncomingTurn,
} from "@/lib/widget/conversation-persistence";
import { getPublicWidgetBundle } from "@/lib/widget/public-widget";

export const runtime = "nodejs";
export const maxDuration = 45;

type ChatRequestBody = {
  messages?: UIMessage[];
  conversationId?: string;
};

function messageText(message: UIMessage) {
  if (!Array.isArray(message.parts)) return "";

  const textParts: string[] = [];
  for (const part of message.parts) {
    if (
      part &&
      typeof part === "object" &&
      "type" in part &&
      part.type === "text" &&
      "text" in part &&
      typeof part.text === "string"
    ) {
      textParts.push(part.text);
    }
  }

  return textParts.join(" ").trim();
}

function recentSearchQuery(messages: UIMessage[]) {
  return messages
    .slice(-6)
    .map((message) => {
      const text = messageText(message);
      return text ? `${message.role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 5000);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  if (!requestHasTrustedOrigin(req)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("AI service is not configured.", 503);
  }

  const { publicKey } = await params;
  const bundle = await getPublicWidgetBundle(publicKey);
  if (!bundle) {
    return jsonError("Widget not available.", 404);
  }

  const parsed = await parseJsonBody<ChatRequestBody>(req);
  if (!parsed.ok) return parsed.response;

  const rawMessages = parsed.value.messages;
  const conversationId = parsed.value.conversationId;

  const requestIssue = getChatRequestIssue(rawMessages);
  if (requestIssue) {
    const status = requestIssue === "message_too_long" ? 413 : 400;
    return jsonError("Chat request rejected.", status, {}, requestIssue);
  }

  if (!validConversationId(conversationId)) {
    return jsonError("Invalid conversation id.", 400);
  }

  // Runtime validation above guarantees this is a valid UIMessage array.
  const messages = rawMessages as UIMessage[];

  const [ipLimit, conversationLimit] = await Promise.all([
    consumeRateLimit({
      request: req,
      namespace: `widget-${publicKey}-ip`,
      limit: 30,
      windowSeconds: 10 * 60,
    }),
    consumeRateLimit({
      request: req,
      namespace: `widget-${publicKey}-conversation`,
      subject: `conversation:${conversationId}`,
      limit: 40,
      windowSeconds: 30 * 60,
    }),
  ]);

  if (!conversationLimit.allowed) {
    return rateLimitResponse(
      conversationLimit.retryAfterSeconds,
      "chat_message_limit",
    );
  }

  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds, "rate_limited");
  }

  const query = recentSearchQuery(messages);

  try {
    await persistWidgetIncomingTurn({ conversationId, messages, bundle });
  } catch (error) {
    console.error("Widget conversation persistence failed:", error);
    return jsonError("Could not save the conversation.", 500);
  }

  const [matches, internalEntries] = await Promise.all([
    retrieveClientKnowledge(bundle.organization.id, query),
    getPublishedInternalClientKnowledge(bundle.organization.id),
  ]);

  const publicKnowledgeContext = clientKnowledgePromptContext(
    bundle.organization.name,
    matches,
  );
  const internalKnowledgeContext = clientInternalKnowledgePromptContext(
    bundle.organization.name,
    internalEntries,
  );

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL || "gpt-5.6-luna"),
    system: buildClientAgentSystemPrompt({
      organization: bundle.organization,
      config: bundle.agent,
      publicKnowledgeContext,
      internalKnowledgeContext,
    }),
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      try {
        await persistWidgetAssistantMessage({ conversationId, content: text });
      } catch (error) {
        console.error("Widget assistant persistence failed:", error);
      }
    },
  });

  return result.toUIMessageStreamResponse({ headers: chatResponseHeaders });
}
