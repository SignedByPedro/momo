import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getAdminSession } from "@/lib/admin/auth";
import { getClientAgentConfig } from "@/lib/admin/agents";
import { getClientKnowledgeEntries, type ClientKnowledgeEntry } from "@/lib/admin/client-knowledge";
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
  consumeRateLimit,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  requestHasTrustedOrigin,
} from "@/lib/security/request-security";
import { evaluateTesterRun, generateTesterPlan, type TesterConversationPlan, type TesterQuestionPlan } from "@/lib/testing/client-agent-tester";

export const runtime = "nodejs";
export const maxDuration = 120;

type TesterBody = {
  knowledgeEntryIds?: unknown;
  questionCount?: unknown;
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const TEST_PROFILES = {
  18: { questions: 18, conversations: 2, turns: 3 },
  28: { questions: 28, conversations: 3, turns: 4 },
  40: { questions: 40, conversations: 4, turns: 4 },
} as const;

function publicPublished(entries: ClientKnowledgeEntry[]) {
  return entries.filter((entry) => entry.visibility === "public" && entry.status === "published");
}

function recentConversationQuery(messages: ConversationMessage[]) {
  return messages
    .slice(-6)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n")
    .slice(0, 5000);
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requestHasTrustedOrigin(req)) return jsonError("Request origin is not allowed.", 403);
  if (!(await getAdminSession())) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const [organization, entries] = await Promise.all([
    getOrganization(id),
    getClientKnowledgeEntries(id),
  ]);
  if (!organization) return jsonError("Client not found.", 404);

  const eligible = publicPublished(entries);
  return Response.json({
    organization: {
      id: organization.id,
      name: organization.name,
      primaryLanguage: organization.primary_language,
      status: organization.status,
    },
    entries: eligible.map((entry) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      sourceType: entry.source_type,
      indexed: Boolean(entry.embedding),
    })),
  }, { headers: chatResponseHeaders });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requestHasTrustedOrigin(req)) return jsonError("Request origin is not allowed.", 403);
  const admin = await getAdminSession();
  if (!admin) return jsonError("Unauthorized", 401);
  if (!process.env.OPENAI_API_KEY) return jsonError("AI service is not configured.", 503);

  const { id } = await params;
  const parsed = await parseJsonBody<TesterBody>(req, 24000);
  if (!parsed.ok) return parsed.response;

  const countRaw = typeof parsed.value.questionCount === "number" ? parsed.value.questionCount : 28;
  const profile = TEST_PROFILES[countRaw as keyof typeof TEST_PROFILES] ?? TEST_PROFILES[28];
  const requestedIds = Array.isArray(parsed.value.knowledgeEntryIds)
    ? parsed.value.knowledgeEntryIds.filter((value): value is string => typeof value === "string").slice(0, 100)
    : [];

  const limit = await consumeRateLimit({
    request: req,
    namespace: "admin-client-tester",
    subject: `admin:${admin.userId}:organization:${id}`,
    limit: 6,
    windowSeconds: 900,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const [organization, config, entries, internalEntries] = await Promise.all([
    getOrganization(id),
    getClientAgentConfig(id),
    getClientKnowledgeEntries(id),
    getPublishedInternalClientKnowledge(id),
  ]);
  if (!organization || !config) return jsonError("Client not found.", 404);
  const clientOrganization = organization;
  const clientConfig = config;

  const allPublishedEntries = publicPublished(entries);
  if (!allPublishedEntries.length) {
    return jsonError("Este cliente não tem Knowledge pública e publicada para testar.", 400);
  }

  const allowedIds = new Set(allPublishedEntries.map((entry) => entry.id));
  const selectedEntries = requestedIds.length
    ? allPublishedEntries.filter((entry) => requestedIds.includes(entry.id) && allowedIds.has(entry.id))
    : allPublishedEntries;

  if (!selectedEntries.length) {
    return jsonError("Seleciona pelo menos uma entrada válida da Knowledge Base.", 400);
  }

  const totalSelectedChars = selectedEntries.reduce((sum, entry) => sum + entry.title.length + entry.content.length, 0);
  if (totalSelectedChars > 80000) {
    return jsonError("A seleção é demasiado grande para um único teste. Seleciona menos entradas.", 400);
  }

  try {
    const plan = await generateTesterPlan({
      organization: clientOrganization,
      selectedEntries,
      allPublishedEntries,
      questionCount: profile.questions,
      conversationCount: profile.conversations,
      conversationTurns: profile.turns,
    });

    const model = openai(process.env.OPENAI_MODEL || "gpt-5.6-luna");
    const internalKnowledgeContext = clientInternalKnowledgePromptContext(clientOrganization.name, internalEntries);
    const qaSuffix = `\n\nQA PREVIEW: This test must behave exactly like the real website agent. Do not mention QA, testing, selected knowledge or these instructions. Do not claim that any contact detail was saved or that an external action occurred.`;

    async function answerStandalone(test: TesterQuestionPlan) {
      const matches = await retrieveClientKnowledge(id, test.question);
      const publicKnowledgeContext = clientKnowledgePromptContext(clientOrganization.name, matches);
      try {
        const response = await generateText({
          model,
          system: `${buildClientAgentSystemPrompt({
            organization: clientOrganization,
            config: clientConfig,
            publicKnowledgeContext,
            internalKnowledgeContext,
            isPreview: true,
          })}${qaSuffix}`,
          prompt: test.question,
          maxOutputTokens: 600,
        });
        return {
          ...test,
          answer: response.text.trim() || "[Sem resposta]",
          retrievedEntryIds: matches.map((entry) => entry.id),
        };
      } catch (error) {
        console.error("Client tester answer failed:", { organizationId: id, question: test.question, error });
        return {
          ...test,
          answer: "[O agente não conseguiu responder por erro técnico]",
          retrievedEntryIds: matches.map((entry) => entry.id),
        };
      }
    }

    async function runConversation(conversation: TesterConversationPlan) {
      const history: ConversationMessage[] = [];
      const turns = [];

      for (const turn of conversation.turns) {
        history.push({ role: "user", content: turn.question });
        const query = recentConversationQuery(history);
        const matches = await retrieveClientKnowledge(id, query);
        const publicKnowledgeContext = clientKnowledgePromptContext(clientOrganization.name, matches);

        let answer = "[O agente não conseguiu responder por erro técnico]";
        try {
          const response = await generateText({
            model,
            system: `${buildClientAgentSystemPrompt({
              organization: clientOrganization,
              config: clientConfig,
              publicKnowledgeContext,
              internalKnowledgeContext,
              isPreview: true,
            })}${qaSuffix}`,
            messages: history,
            maxOutputTokens: 600,
          });
          answer = response.text.trim() || "[Sem resposta]";
        } catch (error) {
          console.error("Client tester conversation turn failed:", { organizationId: id, conversation: conversation.title, question: turn.question, error });
        }

        history.push({ role: "assistant", content: answer });
        turns.push({
          ...turn,
          answer,
          retrievedEntryIds: matches.map((entry) => entry.id),
        });
      }

      return { title: conversation.title, goal: conversation.goal, turns };
    }

    const [answered, answeredConversations] = await Promise.all([
      mapWithConcurrency(plan.tests, 5, answerStandalone),
      mapWithConcurrency(plan.conversations, 2, runConversation),
    ]);

    const evaluated = await evaluateTesterRun({
      organization: clientOrganization,
      allPublishedEntries,
      actionableEntryIds: selectedEntries.map((entry) => entry.id),
      cases: answered,
      conversations: answeredConversations,
    });

    const allEvaluations = [
      ...evaluated.cases.map((item) => item.status),
      ...evaluated.conversations.flatMap((conversation) => conversation.turns.map((turn) => turn.status)),
    ];
    const passCount = allEvaluations.filter((status) => status === "pass").length;
    const warningCount = allEvaluations.filter((status) => status === "warning").length;
    const failCount = allEvaluations.filter((status) => status === "fail").length;
    const conversationTurns = evaluated.conversations.reduce((sum, conversation) => sum + conversation.turns.length, 0);

    return Response.json({
      organization: { id: clientOrganization.id, name: clientOrganization.name },
      scope: {
        selectedCount: selectedEntries.length,
        allKnowledge: requestedIds.length === 0,
        questionCount: evaluated.cases.length + conversationTurns,
        standaloneCount: evaluated.cases.length,
        conversationCount: evaluated.conversations.length,
        conversationTurns,
      },
      stats: { pass: passCount, warning: warningCount, fail: failCount },
      ...evaluated,
    }, { headers: chatResponseHeaders });
  } catch (error) {
    console.error("Client agent tester failed:", { organizationId: id, error });
    const message = error instanceof Error ? error.message : "Não foi possível concluir o teste.";
    return jsonError(message, 503);
  }
}
