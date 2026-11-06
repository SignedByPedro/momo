import { Buffer } from "node:buffer";

import { DOCUMENT_MAX_BYTES, type DocumentKnowledgeAnalysis, type DocumentKnowledgeDraft } from "@/lib/knowledge/document-import-shared";

export type { DocumentKnowledgeAnalysis, DocumentKnowledgeDraft } from "@/lib/knowledge/document-import-shared";

const MAX_ENTRIES = 50;

const extensionMime: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  tsv: "text/tsv",
  txt: "text/plain",
  md: "text/markdown",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  json: "application/json",
};

function extensionOf(filename: string) {
  return filename.toLowerCase().split(".").pop() ?? "";
}

export function supportedKnowledgeDocument(filename: string) {
  return Boolean(extensionMime[extensionOf(filename)]);
}

function documentMime(file: File) {
  const extension = extensionOf(file.name);
  return file.type || extensionMime[extension] || "application/octet-stream";
}

function cleanDraft(value: unknown): DocumentKnowledgeDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim().slice(0, 180) : "";
  const category = typeof candidate.category === "string" ? candidate.category.trim().slice(0, 80) : "";
  const content = typeof candidate.content === "string" ? candidate.content.trim().slice(0, 8_000) : "";
  if (!title || !content) return null;
  return { title, category: category || "FAQ", content };
}

function responseOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        parts.push((part as { text: string }).text);
      }
    }
  }
  return parts.join("\n").trim();
}

export async function analyzeKnowledgeDocument(args: {
  file: File;
  organizationName: string;
  primaryLanguage: string | null | undefined;
}): Promise<DocumentKnowledgeAnalysis> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing.");
  if (!supportedKnowledgeDocument(args.file.name)) throw new Error("Formato de ficheiro não suportado.");
  if (args.file.size <= 0) throw new Error("O ficheiro está vazio.");
  if (args.file.size > DOCUMENT_MAX_BYTES) throw new Error("O ficheiro excede o limite de 25 MB.");

  const mime = documentMime(args.file);
  const bytes = Buffer.from(await args.file.arrayBuffer());
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
  const language = args.primaryLanguage === "en" ? "English" : "European Portuguese";
  const model = process.env.OPENAI_DOCUMENT_MODEL || "gpt-5.6-terra";

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      entries: {
        type: "array",
        maxItems: MAX_ENTRIES,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            content: { type: "string" },
          },
          required: ["title", "category", "content"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "entries"],
    additionalProperties: false,
  };

  const prompt = `You are preparing a clean Knowledge Base for the client-facing AI agent of ${args.organizationName}.

Read the attached file and extract ONLY business information actually present in it. Return knowledge entries in ${language}.

KNOWLEDGE STRUCTURE RULES
- Create MULTIPLE focused entries whenever the file contains independently queryable topics, FAQs, policies, services, products, prices, schedules, conditions or exceptions.
- Never put an entire document or spreadsheet into one giant entry when its information can be separated meaningfully.
- Do not create one entry per cell, sentence or row merely because the source is a spreadsheet. Group rows only when they belong to the same customer-facing topic.
- A FAQ document should normally become separate entries for separate questions/topics.
- Keep a rule together with an exception or condition that is necessary to understand that same rule.
- Split unrelated policies even if they appear in the same paragraph or table.
- Preserve exact prices, dates, times, quantities, names, locations, conditions and exceptions.
- Do not invent, infer or complete missing business facts.
- Do not add generic industry knowledge.
- For PDFs, scans, portfolios and visually designed documents, read visible text inside page images even when the PDF has no extractable text layer.
- Ignore decorative text, navigation, repeated headers/footers and content that is not useful to the customer-facing agent.
- If the same fact is repeated, consolidate it rather than creating duplicates.
- Make each title specific enough that semantic retrieval can find it from a natural customer question.
- Content should be self-contained enough to answer that topic without relying on another entry, except where splitting would remove a necessary condition/exception.
- Maximum ${MAX_ENTRIES} entries. If there is more material than can be represented safely, prioritize distinct customer-facing facts and say so in the summary.

The summary should briefly state what was found and how it was split. Do not include facts in the summary that are absent from the file.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 10_000,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: args.file.name,
              file_data: dataUrl,
              ...(mime === "application/pdf" ? { detail: "high" } : {}),
            },
            { type: "input_text", text: prompt },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "momo_document_knowledge",
          strict: true,
          schema,
        },
      },
    }),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: { message?: string } }).error?.message ?? "OpenAI file analysis failed.")
        : "OpenAI file analysis failed.";
    throw new Error(message);
  }

  const raw = responseOutputText(payload);
  if (!raw) throw new Error("O documento não devolveu conhecimento estruturado.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Não foi possível interpretar o resultado da análise do documento.");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Resultado de análise inválido.");
  const candidate = parsed as { summary?: unknown; entries?: unknown };
  const entries = Array.isArray(candidate.entries)
    ? candidate.entries.map(cleanDraft).filter((entry): entry is DocumentKnowledgeDraft => Boolean(entry)).slice(0, MAX_ENTRIES)
    : [];

  if (!entries.length) throw new Error("Não foi encontrada informação útil suficiente para criar Knowledge.");

  return {
    summary: typeof candidate.summary === "string" ? candidate.summary.trim().slice(0, 2_000) : "",
    entries,
  };
}
