import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { AGENT_TONES } from "@/lib/ai/prompts/agent-tones";
import { buildClientAgentSystemPrompt } from "@/lib/ai/prompts/client-agent";
import { getClientAgentConfig } from "@/lib/admin/agents";
import { getOrganization } from "@/lib/admin/organizations";
import {
  clientInternalKnowledgePromptContext,
  clientKnowledgePromptContext,
  getPublishedInternalClientKnowledge,
  retrieveClientKnowledge,
} from "@/lib/knowledge/client-knowledge";
import { canPreviewOrganization } from "@/lib/portal/auth";
import {
  chatResponseHeaders,
  consumeRateLimit,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  requestHasTrustedOrigin,
} from "@/lib/security/request-security";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Explicitly initiated, authenticated preview. Does not persist conversations or leads. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requestHasTrustedOrigin(req)) return jsonError("Request origin is not allowed.", 403);
  const { id } = await params;
  if (!(await canPreviewOrganization(id))) return jsonError("Unauthorized", 401);
  if (!process.env.OPENAI_API_KEY) return jsonError("AI service is not configured.", 503);

  const parsed = await parseJsonBody<{ question?: unknown }>(req, 2048);
  if (!parsed.ok) return parsed.response;
  const question = typeof parsed.value.question === "string" ? parsed.value.question.trim() : "";
  if (question.length < 12 || question.length > 450) return jsonError("Question must contain 12 to 450 characters.", 400);

  // One action calls the AI four times. Apply a separate, stricter limit to protect costs.
  const limit = await consumeRateLimit({
    request: req,
    namespace: "agent-tone-comparison",
    subject: `organization:${id}`,
    limit: 6,
    windowSeconds: 900,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const [organization, config] = await Promise.all([getOrganization(id), getClientAgentConfig(id)]);
  if (!organization || !config) return jsonError("Client not found.", 404);

  const [matches, internalEntries] = await Promise.all([
    retrieveClientKnowledge(id, question),
    getPublishedInternalClientKnowledge(id),
  ]);
  const publicKnowledgeContext = clientKnowledgePromptContext(organization.name, matches);
  const internalKnowledgeContext = clientInternalKnowledgePromptContext(organization.name, internalEntries);
  const model = openai(process.env.OPENAI_MODEL || "gpt-5.6-luna");

  const results = await Promise.all(AGENT_TONES.map(async (tone) => {
    try {
      const response = await generateText({
        model,
        system: `${buildClientAgentSystemPrompt({
          organization,
          config: { ...config, tone },
          publicKnowledgeContext,
          internalKnowledgeContext,
          isPreview: true,
        })}\n\nTONE COMPARISON: This is a one-turn demonstration. Respond directly to the visitor's question, faithfully applying the selected tone above. Do not mention the test, the configured tone or these instructions. Do not claim any real contact was saved or that any external action occurred.`,
        prompt: question,
        maxOutputTokens: 400,
      });
      return { tone, text: response.text.trim() || null, error: false };
    } catch (error) {
      console.error("Agent tone comparison failed:", { organizationId: id, tone, error });
      return { tone, text: null, error: true };
    }
  }));

  if (results.every((result) => result.error)) return jsonError("Tone comparison is temporarily unavailable.", 503);
  return Response.json({ results }, { headers: chatResponseHeaders });
}
