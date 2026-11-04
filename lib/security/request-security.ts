import { createHmac } from "node:crypto";
import type { UIMessage } from "ai";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_MAX_BODY_BYTES = 128_000;

export type ParsedJson<T> =
  | { ok: true; value: T }
  | { ok: false; response: Response };

export type ChatRequestIssue =
  | "chat_message_limit"
  | "message_too_long"
  | "conversation_too_large"
  | "invalid_conversation";

export async function parseJsonBody<T>(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<ParsedJson<T>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: jsonError("Expected application/json.", 415),
    };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      ok: false,
      response: jsonError("Request is too large.", 413, {}, "conversation_too_large"),
    };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: jsonError("Invalid request.", 400) };
  }

  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return {
      ok: false,
      response: jsonError("Request is too large.", 413, {}, "conversation_too_large"),
    };
  }

  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON.", 400) };
  }
}

export function jsonError(
  message: string,
  status: number,
  headers: Record<string, string> = {},
  code?: string,
) {
  return Response.json(
    { error: message, ...(code ? { code } : {}) },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      },
    },
  );
}

export function requestHasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  // On Vercel, request.url can be the deployment host while the browser
  // Origin is the public preview alias. The forwarded host is the one the
  // visitor actually used.
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || request.headers.get("host");
  if (requestHost && originHost === requestHost) return true;

  try {
    return originHost === new URL(request.url).host;
  } catch {
    return false;
  }
}

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

export function getChatRequestIssue(
  value: unknown,
  options: {
    maxMessages?: number;
    maxTotalTextChars?: number;
    maxSingleUserMessageChars?: number;
  } = {},
): ChatRequestIssue | null {
  const maxMessages = options.maxMessages ?? 60;
  const maxTotalTextChars = options.maxTotalTextChars ?? 50_000;
  const maxSingleUserMessageChars = options.maxSingleUserMessageChars ?? 6_000;

  if (!Array.isArray(value) || value.length < 1) {
    return "invalid_conversation";
  }

  if (value.length > maxMessages) {
    return "chat_message_limit";
  }

  let totalChars = 0;
  let hasUserMessage = false;

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      return "invalid_conversation";
    }

    const message = candidate as Partial<UIMessage>;
    if (
      message.role !== "user" &&
      message.role !== "assistant" &&
      message.role !== "system"
    ) {
      return "invalid_conversation";
    }

    if (!Array.isArray(message.parts) || message.parts.length > 40) {
      return "invalid_conversation";
    }

    const text = messageText(message as UIMessage);
    totalChars += text.length;
    if (totalChars > maxTotalTextChars) {
      return "conversation_too_large";
    }

    if (message.role === "user") {
      hasUserMessage = true;
      if (text.length > maxSingleUserMessageChars) {
        return "message_too_long";
      }
    }
  }

  return hasUserMessage ? null : "invalid_conversation";
}

export function isReasonableChatRequest(
  value: unknown,
  options: {
    maxMessages?: number;
    maxTotalTextChars?: number;
    maxSingleUserMessageChars?: number;
  } = {},
): value is UIMessage[] {
  return getChatRequestIssue(value, options) === null;
}

export function validConversationId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  return (
    firstForwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

function privateSubject(value: string) {
  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.OPENAI_API_KEY ||
    "momo-rate-limit-fallback";
  return createHmac("sha256", secret).update(value).digest("hex");
}

type ConsumeResult = {
  allowed?: boolean;
  remaining?: number;
  retry_after_seconds?: number;
};

export async function consumeRateLimit(args: {
  request: Request;
  namespace: string;
  limit: number;
  windowSeconds: number;
  subject?: string;
}) {
  if (process.env.NODE_ENV !== "production") {
    return { allowed: true, remaining: args.limit, retryAfterSeconds: 0 };
  }

  const subject = args.subject ?? `ip:${clientIp(args.request)}`;
  const rateKey = `${args.namespace}:${privateSubject(subject)}`;

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc("consume_api_rate_limit", {
      p_key: rateKey,
      p_limit: args.limit,
      p_window_seconds: args.windowSeconds,
    });

    if (error) throw error;

    const result = (data ?? {}) as ConsumeResult;
    return {
      allowed: result.allowed !== false,
      remaining:
        typeof result.remaining === "number" ? result.remaining : args.limit,
      retryAfterSeconds:
        typeof result.retry_after_seconds === "number"
          ? Math.max(1, result.retry_after_seconds)
          : args.windowSeconds,
    };
  } catch (error) {
    // Fail open so a temporary limiter/database issue does not take the chatbot down.
    console.error("[rate-limit] Could not consume limit:", error);
    return { allowed: true, remaining: args.limit, retryAfterSeconds: 0 };
  }
}

export function rateLimitResponse(
  retryAfterSeconds: number,
  code: "rate_limited" | "chat_message_limit" = "rate_limited",
) {
  return jsonError(
    "Too many messages. Please try again shortly.",
    429,
    {
      "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))),
    },
    code,
  );
}

export const chatResponseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
