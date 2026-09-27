import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { canPreviewOrganization } from "@/lib/portal/auth";
import { getClientAgentConfig } from "@/lib/admin/agents";
import { getOrganization } from "@/lib/admin/organizations";
import { buildClientAgentSystemPrompt } from "@/lib/ai/prompts/client-agent";
import {
  clientInternalKnowledgePromptContext,
  clientKnowledgePromptContext,
  getPublishedInternalClientKnowledge,
  retrieveClientKnowledge,
} from "@/lib/knowledge/client-knowledge";
import {
  chatResponseHeaders,
  isReasonableChatRequest,
  jsonError,
  parseJsonBody,
  requestHasTrustedOrigin,
} from "@/lib/security/request-security";

export const runtime = "nodejs";
export const maxDuration = 45;

type ChatRequestBody = {
  messages?: UIMessage[];
};

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
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
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requestHasTrustedOrigin(req)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  const { id } = await params;
  if (!(await canPreviewOrganization(id))) {
    return jsonError("Unauthorized", 401);
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("AI service is not configured.", 503);
  }

  const parsed = await parseJsonBody<ChatRequestBody>(req);
  if (!parsed.ok) return parsed.response;

  const messages = parsed.value.messages;
  if (!isReasonableChatRequest(messages)) {
    return jsonError("Invalid conversation.", 400);
  }

  const [organization, config] = await Promise.all([
    getOrganization(id),
    getClientAgentConfig(id),
  ]);

  if (!organization || !config) {
    return jsonError("Client not found.", 404);
  }

  const query = recentSearchQuery(messages);
  const [matches, internalEntries] = await Promise.all([
    retrieveClientKnowledge(id, query),
    getPublishedInternalClientKnowledge(id),
  ]);

  const publicKnowledgeContext = clientKnowledgePromptContext(
    organization.name,
    matches,
  );
  const internalKnowledgeContext = clientInternalKnowledgePromptContext(
    organization.name,
    internalEntries,
  );

  console.log("Client agent preview:", {
    organization: organization.name,
    organizationId: id,
    publicMatches: matches.length,
    internalEntries: internalEntries.length,
  });

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL || "gpt-5.6-luna"),
    system: buildClientAgentSystemPrompt({
      organization,
      config,
      publicKnowledgeContext,
      internalKnowledgeContext,
      isPreview: true,
    }),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ headers: chatResponseHeaders });
}
