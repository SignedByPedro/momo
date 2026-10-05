import { createPublishedKnowledgeFromSupport, normalizeSupportKnowledgeDraft } from "@/lib/knowledge/client-knowledge-write";
import { requirePortal } from "@/lib/portal/auth";
import {
  consumeRateLimit,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  requestHasTrustedOrigin,
} from "@/lib/security/request-security";

export const runtime = "nodejs";
export const maxDuration = 45;

type KnowledgeActionRequest = {
  action?: unknown;
  draft?: unknown;
};

export async function POST(req: Request) {
  if (!requestHasTrustedOrigin(req)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  const session = await requirePortal();
  if (session.role !== "client_owner") {
    return jsonError("Only an Owner can add Knowledge Base entries.", 403, {}, "owner_required");
  }

  const parsed = await parseJsonBody<KnowledgeActionRequest>(req, 16_000);
  if (!parsed.ok) return parsed.response;
  if (parsed.value.action !== "save") {
    return jsonError("Invalid Knowledge action.", 400);
  }

  const draft = normalizeSupportKnowledgeDraft(parsed.value.draft);
  if (!draft) {
    return jsonError("Invalid Knowledge draft.", 400);
  }

  const rateLimit = await consumeRateLimit({
    request: req,
    namespace: "portal-support-knowledge-save",
    subject: `user:${session.userId}`,
    limit: 12,
    windowSeconds: 10 * 60,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, "rate_limited");
  }

  try {
    const saved = await createPublishedKnowledgeFromSupport({
      organizationId: session.organizationId,
      draft,
    });

    return Response.json(
      {
        saved: {
          id: saved.id,
          title: saved.title,
          alreadyExisted: saved.alreadyExisted,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    console.error("[portal-support] Could not save Knowledge draft action:", error);
    return jsonError("Could not save the Knowledge draft right now.", 500, {}, "knowledge_save_failed");
  }
}
