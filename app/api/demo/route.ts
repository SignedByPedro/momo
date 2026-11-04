import {
  presentDemo,
  startDemoSession,
  submitDemoEmail,
  submitDemoInterest,
  submitDemoName,
  submitDemoPrice,
  submitDemoQuestion,
  DemoFlowError,
  getDemoSession,
} from "@/lib/demo/sessions";
import { isPriceBand, isQuestionId, type DemoLanguage } from "@/lib/demo/script";
import {
  chatResponseHeaders,
  consumeRateLimit,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  requestHasTrustedOrigin,
  validConversationId,
} from "@/lib/security/request-security";

export const runtime = "nodejs";

type DemoRequestBody = {
  action?: string;
  sessionId?: string;
  language?: string;
  name?: string;
  questionId?: string;
  priceBand?: string;
  interested?: boolean;
  email?: string;
};

function languageOf(value: unknown): DemoLanguage {
  return value === "en" ? "en" : "pt";
}

export async function GET(request: Request) {
  if (!requestHasTrustedOrigin(request)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!validConversationId(sessionId)) {
    return jsonError("Invalid demo session.", 400);
  }

  const limit = await consumeRateLimit({
    request,
    namespace: "momo-demo-read",
    subject: `demo:${sessionId}`,
    limit: 60,
    windowSeconds: 10 * 60,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const session = await getDemoSession(sessionId);
    if (!session) return jsonError("Demo session not found.", 404);
    return Response.json({ session: presentDemo(session) }, { headers: chatResponseHeaders });
  } catch (error) {
    return demoError(error);
  }
}

export async function POST(request: Request) {
  if (!requestHasTrustedOrigin(request)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  const parsed = await parseJsonBody<DemoRequestBody>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  try {
    if (body.action === "start") {
      const limit = await consumeRateLimit({
        request,
        namespace: "momo-demo-start",
        limit: 8,
        windowSeconds: 10 * 60,
      });
      if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

      const session = await startDemoSession(languageOf(body.language));
      return Response.json({ session: presentDemo(session) }, { headers: chatResponseHeaders });
    }

    if (!validConversationId(body.sessionId)) {
      return jsonError("Invalid demo session.", 400);
    }

    const [ipLimit, sessionLimit] = await Promise.all([
      consumeRateLimit({
        request,
        namespace: "momo-demo-ip",
        limit: 40,
        windowSeconds: 10 * 60,
      }),
      consumeRateLimit({
        request,
        namespace: "momo-demo-session",
        subject: `demo:${body.sessionId}`,
        limit: 40,
        windowSeconds: 30 * 60,
      }),
    ]);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);
    if (!sessionLimit.allowed) return rateLimitResponse(sessionLimit.retryAfterSeconds, "chat_message_limit");

    const result = await applyAction(body.sessionId, body);
    return Response.json(
      { session: presentDemo(result.session) },
      { status: result.conflict ? 409 : 200, headers: chatResponseHeaders },
    );
  } catch (error) {
    return demoError(error);
  }
}

async function applyAction(sessionId: string, body: DemoRequestBody) {
  switch (body.action) {
    case "name":
      return submitDemoName(sessionId, typeof body.name === "string" ? body.name : "");
    case "question":
      if (!isQuestionId(body.questionId)) throw new DemoFlowError(400, "Unknown question.");
      return submitDemoQuestion(sessionId, body.questionId);
    case "price":
      if (!isPriceBand(body.priceBand)) throw new DemoFlowError(400, "Unknown price.");
      return submitDemoPrice(sessionId, body.priceBand);
    case "interest":
      if (typeof body.interested !== "boolean") throw new DemoFlowError(400, "Unknown answer.");
      return submitDemoInterest(sessionId, body.interested);
    case "email":
      return submitDemoEmail(sessionId, typeof body.email === "string" ? body.email : "");
    default:
      throw new DemoFlowError(400, "Unknown demo action.");
  }
}

function demoError(error: unknown) {
  if (error instanceof DemoFlowError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof Error && error.message.includes("SUPABASE_URL")) {
    return jsonError("Demo storage is not ready.", 503);
  }
  console.error("Demo request failed:", error);
  return jsonError("Could not save the demo.", 500);
}
