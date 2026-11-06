import { randomUUID } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  QUESTION_IDS,
  cleanContact,
  cleanName,
  demoCopy,
  isDemoPhase,
  isPriceBand,
  isQuestionId,
  priceLabel,
  toDemoView,
  type DemoLanguage,
  type DemoSessionState,
  type DemoTranscriptTurn,
  type PriceBand,
  type QuestionId,
} from "@/lib/demo/script";

export class DemoFlowError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isDemoTableMissing(error: unknown) {
  return error instanceof DemoFlowError && error.status === 503;
}

type DemoSessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  language: string;
  phase: string;
  visitor_name: string | null;
  questions_seen: string[] | null;
  price_band: string | null;
  interested: boolean | null;
  email: string | null;
  transcript: unknown;
  free_conversation_id: string | null;
};

function turn(role: DemoTranscriptTurn["role"], text: string, at: string): DemoTranscriptTurn {
  return { role, text, at };
}

function mapRow(row: DemoSessionRow): DemoSessionState {
  const language: DemoLanguage = row.language === "en" ? "en" : "pt";
  const phase = isDemoPhase(row.phase) ? row.phase : "awaiting_name";
  const questionsSeen = (row.questions_seen ?? []).filter(isQuestionId);
  const priceBand = isPriceBand(row.price_band) ? row.price_band : null;
  const transcript = Array.isArray(row.transcript)
    ? row.transcript.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const candidate = item as Partial<DemoTranscriptTurn>;
        if (
          (candidate.role !== "user" && candidate.role !== "assistant") ||
          typeof candidate.text !== "string" ||
          typeof candidate.at !== "string"
        ) {
          return [];
        }
        return [{ role: candidate.role, text: candidate.text, at: candidate.at }];
      })
    : [];

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    language,
    phase,
    visitorName: row.visitor_name,
    questionsSeen,
    priceBand,
    interested: typeof row.interested === "boolean" ? row.interested : null,
    email: row.email,
    transcript,
    freeConversationId: row.free_conversation_id,
  };
}

function storageError(error: { message?: string; code?: string }) {
  const message = error.message ?? "";
  if (error.code === "23514" || message.includes("check constraint")) {
    return new DemoFlowError(500, "Could not save the demo.");
  }
  const missing =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("demo_sessions") &&
      (message.includes("does not exist") || message.includes("Could not find")));
  if (missing) {
    return new DemoFlowError(503, "Demo storage is not ready.");
  }
  return new DemoFlowError(500, "Could not save the demo.");
}

async function readSession(id: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("demo_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw storageError(error);
  return data ? mapRow(data as DemoSessionRow) : null;
}

async function saveSession(previous: DemoSessionState, next: DemoSessionState) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("demo_sessions")
    .update({
      updated_at: next.updatedAt,
      completed_at: next.completedAt,
      phase: next.phase,
      visitor_name: next.visitorName,
      questions_seen: next.questionsSeen,
      price_band: next.priceBand,
      interested: next.interested,
      email: next.email,
      transcript: next.transcript,
      free_conversation_id: next.freeConversationId,
    })
    .eq("id", previous.id)
    .eq("updated_at", previous.updatedAt)
    .select("*")
    .maybeSingle();

  if (error) throw storageError(error);
  if (!data) return null;
  return mapRow(data as DemoSessionRow);
}

function withClock(session: DemoSessionState, patch: Partial<DemoSessionState>): DemoSessionState {
  return {
    ...session,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export async function startDemoSession(language: DemoLanguage) {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const text = demoCopy(language);
  const { data, error } = await supabase
    .from("demo_sessions")
    .insert({
      language,
      phase: "awaiting_name",
      transcript: [turn("assistant", text.greeting, now)],
      questions_seen: [],
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw storageError(error);
  return mapRow(data as DemoSessionRow);
}

export async function getDemoSession(id: string) {
  return readSession(id);
}

export async function listDemoSessions() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("demo_sessions")
    .select(
      "id, created_at, updated_at, completed_at, language, phase, visitor_name, questions_seen, price_band, interested, email, free_conversation_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw storageError(error);
  return (data ?? []).map((row) => mapRow({ ...(row as DemoSessionRow), transcript: [] }));
}

async function commitOrCurrent(previous: DemoSessionState, next: DemoSessionState) {
  const saved = await saveSession(previous, next);
  if (saved) return { session: saved, conflict: false as const };
  const current = await readSession(previous.id);
  if (!current) throw new DemoFlowError(404, "Demo session not found.");
  return { session: current, conflict: true as const };
}

export async function submitDemoName(id: string, rawName: string) {
  const session = await readSession(id);
  if (!session) throw new DemoFlowError(404, "Demo session not found.");
  if (session.phase !== "awaiting_name") return { session, conflict: true as const };

  const now = new Date().toISOString();
  const text = demoCopy(session.language);
  const name = cleanName(rawName);
  const spoken = rawName.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

  if (!name) {
    return commitOrCurrent(
      session,
      withClock(session, {
        transcript: [
          ...session.transcript,
          turn("user", spoken || "…", now),
          turn("assistant", text.nameRetry, now),
        ],
      }),
    );
  }

  return commitOrCurrent(
    session,
    withClock(session, {
      phase: "exploring",
      visitorName: name,
      transcript: [
        ...session.transcript,
        turn("user", name, now),
        turn("assistant", text.afterName(name), now),
      ],
    }),
  );
}

export async function submitDemoQuestion(id: string, questionId: QuestionId) {
  const session = await readSession(id);
  if (!session) throw new DemoFlowError(404, "Demo session not found.");
  if (session.phase !== "exploring" || session.questionsSeen.includes(questionId)) {
    return { session, conflict: true as const };
  }

  const now = new Date().toISOString();
  const text = demoCopy(session.language);
  const questionsSeen = [...session.questionsSeen, questionId];
  const transcript = [
    ...session.transcript,
    turn("user", text.questions[questionId], now),
    turn("assistant", text.answers[questionId], now),
  ];

  if (questionsSeen.length === QUESTION_IDS.length) {
    transcript.push(turn("assistant", text.priceQuestion, now));
    return commitOrCurrent(
      session,
      withClock(session, {
        phase: "awaiting_price",
        questionsSeen,
        transcript,
      }),
    );
  }

  return commitOrCurrent(session, withClock(session, { questionsSeen, transcript }));
}

export async function submitDemoPrice(id: string, band: PriceBand) {
  const session = await readSession(id);
  if (!session) throw new DemoFlowError(404, "Demo session not found.");
  if (session.phase !== "awaiting_price") return { session, conflict: true as const };

  const now = new Date().toISOString();
  const text = demoCopy(session.language);
  return commitOrCurrent(
    session,
    withClock(session, {
      phase: "awaiting_email",
      priceBand: band,
      transcript: [
        ...session.transcript,
        turn("user", priceLabel(band), now),
        turn("assistant", text.emailAsk, now),
      ],
    }),
  );
}

function openFreeChat(session: DemoSessionState, handoff: string, at: string): Partial<DemoSessionState> {
  return {
    phase: "free",
    completedAt: at,
    freeConversationId: session.freeConversationId ?? randomUUID(),
    transcript: [...session.transcript, turn("assistant", handoff, at)],
  };
}

export async function submitDemoInterest(id: string, interested: boolean) {
  const session = await readSession(id);
  if (!session) throw new DemoFlowError(404, "Demo session not found.");
  if (session.phase !== "awaiting_interest" && session.phase !== "awaiting_email") {
    return { session, conflict: true as const };
  }

  const now = new Date().toISOString();
  const text = demoCopy(session.language);
  const name = session.visitorName ?? "";
  const choice = interested ? text.yes : text.no;
  const transcript = [...session.transcript, turn("user", choice, now)];

  if (!interested) {
    return commitOrCurrent(
      session,
      withClock(session, {
        interested: false,
        transcript,
        ...openFreeChat({ ...session, transcript }, text.handoffNo(name), now),
      }),
    );
  }

  return commitOrCurrent(
    session,
    withClock(session, {
      phase: "awaiting_email",
      interested: true,
      transcript: [...transcript, turn("assistant", text.emailAsk, now)],
    }),
  );
}

export async function submitDemoEmail(id: string, rawEmail: string) {
  const session = await readSession(id);
  if (!session) throw new DemoFlowError(404, "Demo session not found.");
  if (session.phase !== "awaiting_email") return { session, conflict: true as const };

  const now = new Date().toISOString();
  const text = demoCopy(session.language);
  const spoken = rawEmail.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 180);
  const email = cleanContact(rawEmail);
  const name = session.visitorName ?? "";

  if (!email) {
    return commitOrCurrent(
      session,
      withClock(session, {
        transcript: [
          ...session.transcript,
          turn("user", spoken || "…", now),
          turn("assistant", text.emailRetry, now),
        ],
      }),
    );
  }

  const transcript = [...session.transcript, turn("user", email, now)];
  return commitOrCurrent(
    session,
    withClock(session, {
      email,
      interested: true,
      transcript,
      ...openFreeChat({ ...session, transcript }, text.handoffYes(name), now),
    }),
  );
}

export async function recordDemoFreeMessage(args: {
  sessionId: string;
  conversationId: string;
  role: "user" | "assistant";
  text: string;
}) {
  const text = args.text.trim().slice(0, 6000);
  if (!text) return;

  const session = await readSession(args.sessionId);
  if (!session || session.phase !== "free") return;
  if (session.freeConversationId !== args.conversationId) return;
  if (session.transcript.length >= 80) return;
  if (session.transcript.slice(-4).some((item) => item.role === args.role && item.text === text)) return;

  const saved = await saveSession(
    session,
    withClock(session, {
      transcript: [...session.transcript, turn(args.role, text, new Date().toISOString())],
    }),
  );

  if (!saved) {
    const current = await readSession(args.sessionId);
    if (!current || current.phase !== "free" || current.freeConversationId !== args.conversationId) return;
    if (current.transcript.slice(-4).some((item) => item.role === args.role && item.text === text)) return;
    await saveSession(
      current,
      withClock(current, {
        transcript: [...current.transcript, turn(args.role, text, new Date().toISOString())],
      }),
    );
  }
}

export function presentDemo(session: DemoSessionState) {
  return toDemoView(session);
}
