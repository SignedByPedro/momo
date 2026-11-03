export type DocumentKnowledgeDraft = {
  title: string;
  category: string;
  content: string;
};

export type DocumentKnowledgeAnalysis = {
  summary: string;
  entries: DocumentKnowledgeDraft[];
};

export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.rtf,.odt,.xls,.xlsx,.csv,.tsv,.txt,.md,.ppt,.pptx,.json";
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const DOCUMENT_IMPORT_BUCKET = "knowledge-imports";
