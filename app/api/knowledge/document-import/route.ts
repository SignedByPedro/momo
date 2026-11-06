import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { revalidatePath } from "next/cache";
import { getOrganization } from "@/lib/admin/organizations";
import {
  analyzeKnowledgeDocument,
  supportedKnowledgeDocument,
} from "@/lib/knowledge/document-import";
import {
  DOCUMENT_IMPORT_BUCKET,
  DOCUMENT_MAX_BYTES,
  type DocumentKnowledgeDraft,
} from "@/lib/knowledge/document-import-shared";
import { getOrganizationOwnerAccess } from "@/lib/portal/auth";
import {
  consumeRateLimit,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  requestHasTrustedOrigin,
} from "@/lib/security/request-security";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SAVE_ENTRIES = 50;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeEntries(value: unknown): DocumentKnowledgeDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_SAVE_ENTRIES)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = clean(row.title, 180);
      const category = clean(row.category, 80) || "FAQ";
      const content = clean(row.content, 8_000);
      return title && content ? { title, category, content } : null;
    })
    .filter((entry): entry is DocumentKnowledgeDraft => Boolean(entry));
}

function slugPart(value: string, max = 34) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "entry";
}

function safeFilename(value: string) {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return cleaned || "document";
}

function pathBelongsToOrganization(path: string, organizationId: string) {
  return path.startsWith(`${organizationId}/`) && !path.includes("..") && !path.startsWith("/");
}

async function ownerAccessOrResponse(organizationId: string) {
  const access = await getOrganizationOwnerAccess(organizationId);
  if (!access) return { ok: false as const, response: jsonError("Unauthorized", 401) };
  return { ok: true as const, access };
}

export async function POST(request: Request) {
  if (!requestHasTrustedOrigin(request)) return jsonError("Request origin is not allowed.", 403);
  if (!process.env.OPENAI_API_KEY) return jsonError("AI service is not configured.", 503);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  // Legacy small-file path kept for backwards compatibility. The UI now uses
  // signed direct-to-Supabase uploads so files do not cross Vercel's 4.5 MB body limit.
  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Não foi possível ler o ficheiro.", 400);
    }

    const organizationId = clean(formData.get("organizationId"), 100);
    const file = formData.get("file");
    if (!organizationId || !(file instanceof File)) return jsonError("Cliente e ficheiro são obrigatórios.", 400);

    const accessResult = await ownerAccessOrResponse(organizationId);
    if (!accessResult.ok) return accessResult.response;
    if (!supportedKnowledgeDocument(file.name)) return jsonError("Formato de ficheiro não suportado.", 415);
    if (file.size > DOCUMENT_MAX_BYTES) return jsonError("O ficheiro excede o limite de 25 MB.", 413);

    const subject = accessResult.access.admin
      ? `admin:${accessResult.access.admin.userId}`
      : `portal:${accessResult.access.portal?.userId ?? "unknown"}`;
    const limit = await consumeRateLimit({
      request,
      namespace: "knowledge-document-analyze",
      subject: `${subject}:organization:${organizationId}`,
      limit: 12,
      windowSeconds: 3600,
    });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

    const organization = await getOrganization(organizationId);
    if (!organization) return jsonError("Client not found.", 404);

    try {
      const analysis = await analyzeKnowledgeDocument({
        file,
        organizationName: organization.name,
        primaryLanguage: organization.primary_language,
      });
      return Response.json(
        {
          batchId: crypto.randomUUID(),
          filename: file.name.slice(0, 240),
          summary: analysis.summary,
          entries: analysis.entries,
        },
        { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
      );
    } catch (error) {
      console.error("Knowledge document analysis failed:", { organizationId, filename: file.name, error });
      return jsonError(error instanceof Error ? error.message : "Não foi possível analisar o documento.", 500);
    }
  }

  const parsed = await parseJsonBody<{
    action?: unknown;
    organizationId?: unknown;
    filename?: unknown;
    fileSize?: unknown;
    contentType?: unknown;
    storagePath?: unknown;
    batchId?: unknown;
    entries?: unknown;
  }>(request, 500_000);
  if (!parsed.ok) return parsed.response;

  const action = clean(parsed.value.action, 40) || "save";
  const organizationId = clean(parsed.value.organizationId, 100);
  if (!organizationId) return jsonError("Cliente é obrigatório.", 400);

  const accessResult = await ownerAccessOrResponse(organizationId);
  if (!accessResult.ok) return accessResult.response;
  const access = accessResult.access;
  const subject = access.admin ? `admin:${access.admin.userId}` : `portal:${access.portal?.userId ?? "unknown"}`;

  if (action === "prepare-upload") {
    const filename = clean(parsed.value.filename, 240);
    const fileSize = typeof parsed.value.fileSize === "number" ? parsed.value.fileSize : Number(parsed.value.fileSize ?? 0);
    if (!filename || !supportedKnowledgeDocument(filename)) return jsonError("Formato de ficheiro não suportado.", 415);
    if (!Number.isFinite(fileSize) || fileSize <= 0) return jsonError("O ficheiro está vazio.", 400);
    if (fileSize > DOCUMENT_MAX_BYTES) return jsonError("O ficheiro excede o limite de 25 MB.", 413);

    const limit = await consumeRateLimit({
      request,
      namespace: "knowledge-document-upload",
      subject: `${subject}:organization:${organizationId}`,
      limit: 15,
      windowSeconds: 3600,
    });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

    const storagePath = `${organizationId}/${crypto.randomUUID()}-${safeFilename(filename)}`;
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(DOCUMENT_IMPORT_BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !data?.token) {
      console.error("Knowledge document signed upload failed:", { organizationId, filename, error });
      return jsonError("Não foi possível preparar o upload do documento.", 500);
    }

    return Response.json(
      {
        bucket: DOCUMENT_IMPORT_BUCKET,
        storagePath,
        token: data.token,
      },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  }

  if (action === "analyze-uploaded") {
    const filename = clean(parsed.value.filename, 240);
    const storagePath = clean(parsed.value.storagePath, 500);
    if (!filename || !supportedKnowledgeDocument(filename) || !storagePath || !pathBelongsToOrganization(storagePath, organizationId)) {
      return jsonError("Documento temporário inválido.", 400);
    }

    const limit = await consumeRateLimit({
      request,
      namespace: "knowledge-document-analyze",
      subject: `${subject}:organization:${organizationId}`,
      limit: 12,
      windowSeconds: 3600,
    });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

    const organization = await getOrganization(organizationId);
    if (!organization) return jsonError("Client not found.", 404);

    const supabase = createSupabaseAdmin();
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(DOCUMENT_IMPORT_BUCKET)
        .download(storagePath);
      if (downloadError || !blob) throw downloadError ?? new Error("Documento temporário não encontrado.");
      if (blob.size > DOCUMENT_MAX_BYTES) throw new Error("O ficheiro excede o limite de 25 MB.");

      const file = new File([blob], filename, { type: blob.type || clean(parsed.value.contentType, 120) || undefined });
      const analysis = await analyzeKnowledgeDocument({
        file,
        organizationName: organization.name,
        primaryLanguage: organization.primary_language,
      });

      return Response.json(
        {
          batchId: crypto.randomUUID(),
          filename: filename.slice(0, 240),
          summary: analysis.summary,
          entries: analysis.entries,
        },
        { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
      );
    } catch (error) {
      console.error("Knowledge uploaded document analysis failed:", { organizationId, filename, storagePath, error });
      return jsonError(error instanceof Error ? error.message : "Não foi possível analisar o documento.", 500);
    } finally {
      const { error: removeError } = await supabase.storage.from(DOCUMENT_IMPORT_BUCKET).remove([storagePath]);
      if (removeError) console.error("Knowledge temporary document cleanup failed:", { organizationId, storagePath, removeError });
    }
  }

  if (action !== "save") return jsonError("Operação inválida.", 400);

  const batchId = clean(parsed.value.batchId, 100);
  const filename = clean(parsed.value.filename, 240);
  const entries = normalizeEntries(parsed.value.entries);
  if (!validUuid(batchId) || !filename || !entries.length) return jsonError("Importação inválida.", 400);

  const limit = await consumeRateLimit({
    request,
    namespace: "knowledge-document-save",
    subject: `${subject}:organization:${organizationId}`,
    limit: 20,
    windowSeconds: 3600,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const { embeddings } = await embedMany({
      model: openai.embeddingModel("text-embedding-3-small"),
      values: entries.map((entry) => `${entry.title}\n\n${entry.content}`),
    });

    const slugs = entries.map(
      (entry, index) => `org-${organizationId.slice(0, 8)}-doc-${batchId.slice(0, 8)}-${index + 1}-${slugPart(entry.title)}`,
    );
    const supabase = createSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("knowledge_entries")
      .select("slug")
      .eq("organization_id", organizationId)
      .in("slug", slugs);
    if (existingError) throw existingError;
    const existingSlugs = new Set((existing ?? []).map((row) => String(row.slug)));

    const now = new Date().toISOString();
    const rows = entries
      .map((entry, index) => ({
        organization_id: organizationId,
        agent_key: "client",
        slug: slugs[index],
        category: entry.category,
        title: entry.title,
        content: entry.content,
        visibility: "public",
        status: "published",
        source_type: "document",
        source_url: filename,
        embedding: embeddings[index],
        updated_at: now,
      }))
      .filter((row) => !existingSlugs.has(row.slug));

    if (rows.length) {
      const { error: insertError } = await supabase.from("knowledge_entries").insert(rows);
      if (insertError) throw insertError;
    }

    revalidatePath(`/admin/clients/${organizationId}/knowledge`);
    revalidatePath(`/admin/clients/${organizationId}`);
    revalidatePath("/portal/knowledge");

    return Response.json(
      { saved: rows.length, skipped: entries.length - rows.length },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    console.error("Knowledge document save failed:", { organizationId, filename, error });
    return jsonError(error instanceof Error ? error.message : "Não foi possível guardar a Knowledge.", 500);
  }
}
