import { getPortalSession, portalHasPremiumAccess, portalServiceIsClosed } from "@/lib/portal/auth";
import { getOrganization } from "@/lib/admin/organizations";
import {
  applyTesterKnowledgeAction,
  normalizeTesterKnowledgeAction,
} from "@/lib/testing/client-agent-tester-knowledge-actions";
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

type ActionBody = { action?: unknown };

export async function POST(req: Request) {
  if (!requestHasTrustedOrigin(req)) return jsonError("Request origin is not allowed.", 403);
  const session = await getPortalSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "client_owner" || portalServiceIsClosed(session) || !portalHasPremiumAccess(session)) return jsonError("Forbidden", 403);

  const id = session.organizationId;
  const organization = await getOrganization(id);
  if (!organization) return jsonError("Client not found.", 404);

  const parsed = await parseJsonBody<ActionBody>(req, 50000);
  if (!parsed.ok) return parsed.response;
  const action = normalizeTesterKnowledgeAction(parsed.value.action);
  if (!action) return jsonError("A recomendação do Tester é inválida ou incompleta.", 400);

  const limit = await consumeRateLimit({
    request: req,
    namespace: "portal-client-tester-knowledge-action",
    subject: `portal:${session.userId}:organization:${id}`,
    limit: 20,
    windowSeconds: 900,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const result = await applyTesterKnowledgeAction({ organizationId: id, action });
    return Response.json(result, { headers: chatResponseHeaders });
  } catch (error) {
    console.error("Tester Knowledge action failed:", { organizationId: id, actionId: action.id, type: action.type, error });
    const message = error instanceof Error ? error.message : "Não foi possível aplicar a alteração à Knowledge Base.";
    return jsonError(message, 409);
  }
}
