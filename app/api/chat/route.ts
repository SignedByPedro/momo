import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { buildMomoSystemPrompt } from "@/lib/ai/prompts/core";
import {
  deriveConversationState,
  websiteSharedInLatestUserTurn,
} from "@/lib/conversations/state";
import { recordDemoFreeMessage } from "@/lib/demo/sessions";
import { retrieveMomoKnowledge } from "@/lib/knowledge/momo-knowledge";
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
  persistAssistantMessage,
  persistIncomingTurn,
} from "@/lib/supabase/persistence";
import {
  getOrAnalyzeWebsite,
  inferBusinessTypeFromWebsite,
  websiteAnalysisFailurePromptContext,
  websiteAnalysisPromptContext,
} from "@/lib/web/website-analysis";

export const runtime = "nodejs";
export const maxDuration = 45;

type ChatRequestBody = {
  messages?: UIMessage[];
  conversationId?: string;
  language?: "pt" | "en";
  demoSessionId?: string;
};

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function POST(req: Request) {
  if (!requestHasTrustedOrigin(req)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("AI service is not configured.", 503);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return jsonError("Database service is not configured.", 503);
  }

  const parsed = await parseJsonBody<ChatRequestBody>(req);
  if (!parsed.ok) return parsed.response;

  const { messages: rawMessages, conversationId, language, demoSessionId } = parsed.value;

  if (!validConversationId(conversationId)) {
    return jsonError("Invalid conversation id.", 400);
  }

  const requestIssue = getChatRequestIssue(rawMessages);
  if (requestIssue) {
    const status = requestIssue === "message_too_long" ? 413 : 400;
    return jsonError("Chat request rejected.", status, {}, requestIssue);
  }

  // getChatRequestIssue has validated the full message array at runtime.
  // Keep a concrete UIMessage[] from this point on so downstream AI/persistence
  // helpers never receive the optional request-body type.
  const messages = rawMessages as UIMessage[];
  const websiteJustShared = websiteSharedInLatestUserTurn(messages);

  const [ipLimit, conversationLimit] = await Promise.all([
    consumeRateLimit({
      request: req,
      namespace: "momo-sales-ip",
      limit: 30,
      windowSeconds: 10 * 60,
    }),
    consumeRateLimit({
      request: req,
      namespace: "momo-sales-conversation",
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

  let state = deriveConversationState(
    messages,
    language === "en" || language === "pt" ? language : undefined,
  );
  let websiteContext = "";
  let websiteAnalysisAvailable = false;

  const knowledge = await retrieveMomoKnowledge(messages);

  if (state.website) {
    const website = state.website;
    try {
      const analysis = await getOrAnalyzeWebsite(website);
      websiteAnalysisAvailable = true;
      websiteContext = websiteAnalysisPromptContext(analysis);

      if (!state.businessType) {
        const inferredBusinessType = inferBusinessTypeFromWebsite(analysis);
        if (inferredBusinessType) {
          state = { ...state, businessType: inferredBusinessType };
        }
      }

      console.log("Website analysis:", {
        website: analysis.canonicalUrl,
        pages: analysis.sourceUrls.length,
        cached: analysis.fromCache,
      });
    } catch (error) {
      console.warn("Website analysis failed:", error);
      websiteContext = websiteAnalysisFailurePromptContext(website);
    }
  }

  console.log("Momo state:", state);
  console.log("Conversation:", conversationId);
  console.log("Knowledge retrieval:", {
    matches: knowledge.matches.length,
    semantic: knowledge.semantic,
  });

  try {
    await persistIncomingTurn({ conversationId, messages, state });
  } catch (error) {
    console.error("Supabase persistence error before response:", error);
    return jsonError("Could not save the conversation.", 500);
  }

  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  const latestUserText = latestUser ? messageText(latestUser) : "";
  if (validConversationId(demoSessionId) && latestUserText) {
    try {
      await recordDemoFreeMessage({
        sessionId: demoSessionId,
        conversationId,
        role: "user",
        text: latestUserText,
      });
    } catch (error) {
      console.error("Demo transcript error before response:", error);
    }
  }

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL || "gpt-5.6-luna"),
    system: buildMomoSystemPrompt(state, {
      websiteContext,
      websiteAnalysisAvailable,
      websiteJustShared,
      knowledgeContext: knowledge.context,
      knowledgeAvailable: knowledge.matches.length > 0,
    }),
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      try {
        await persistAssistantMessage({
          conversationId,
          content: text,
        });
      } catch (error) {
        console.error("Supabase persistence error after response:", error);
      }

      if (!validConversationId(demoSessionId) || !text.trim()) return;
      try {
        await recordDemoFreeMessage({
          sessionId: demoSessionId,
          conversationId,
          role: "assistant",
          text,
        });
      } catch (error) {
        console.error("Demo transcript error after response:", error);
      }
    },
  });

  return result.toUIMessageStreamResponse({ headers: chatResponseHeaders });
}
