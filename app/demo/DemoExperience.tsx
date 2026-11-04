"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatMessage from "@/components/momo/ChatMessage";
import LauncherChatGlyph, { LAUNCHER_ICON_RATIO } from "@/components/momo/LauncherChatGlyph";
import MomoIcon from "@/components/momo/MomoIcon";
import { demoCopy, type DemoLanguage, type DemoView } from "@/lib/demo/script";
import styles from "./demo.module.css";

const LANGUAGE_STORAGE_KEY = "momo-language";
const LANGUAGE_CHANGE_EVENT = "momo-language-change";
const SESSION_STORAGE_KEY = "momo-demo-session";
const LAUNCHER_SIZE = 60;

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  };
}

function getClientLanguage(): DemoLanguage {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "pt") return stored;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "pt";
}

function getServerLanguage(): DemoLanguage {
  return "pt";
}

function isUuid(value: string | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

function uiText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

class DemoRequestError extends Error {
  status: number;

  constructor(status: number) {
    super("Demo request failed");
    this.status = status;
  }
}

async function requestDemo(input: { method?: "GET" | "POST"; sessionId?: string; body?: unknown }) {
  const method = input.method ?? "POST";
  const response = await fetch(
    method === "GET" ? `/api/demo?sessionId=${input.sessionId}` : "/api/demo",
    {
      method,
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(input.body) : undefined,
    },
  );

  let payload: { session?: DemoView } | null = null;
  try {
    payload = (await response.json()) as { session?: DemoView };
  } catch {
    payload = null;
  }

  if ((response.ok || response.status === 409) && payload?.session) return payload.session;
  throw new DemoRequestError(response.status);
}

async function chatApiFetch(...args: Parameters<typeof fetch>) {
  const response = await fetch(...args);
  if (response.ok) return response;
  let code = "generic";
  try {
    const payload = (await response.clone().json()) as { code?: unknown };
    if (typeof payload.code === "string") code = payload.code;
  } catch {
    // Keep the generic code when the body is not JSON.
  }
  throw new Error(`MOMO_CHAT_ERROR:${code}`);
}

function CloseGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function DemoExperience() {
  const preferredLanguage = useSyncExternalStore(subscribeToLanguage, getClientLanguage, getServerLanguage);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DemoView | null>(null);
  const [typed, setTyped] = useState(0);
  const [launcherVisible, setLauncherVisible] = useState(false);
  const [introGate, setIntroGate] = useState<"checking" | "play" | "skip">("checking");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<DemoView["transcript"]>([]);
  const viewRef = useRef<DemoView | null>(null);

  const { messages, sendMessage, status, error: chatError, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", fetch: chatApiFetch }),
  });

  useEffect(() => {
    viewRef.current = view;
    if (!view) return;
    transcriptRef.current = view.transcript;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, view.sessionId);
  }, [view]);

  const language = view?.language ?? preferredLanguage;
  const text = demoCopy(language);
  const chatBusy = status === "submitted" || status === "streaming";
  const heroPhrase = `${text.heroLead}${text.heroAccent}`;
  const shownLead = launcherVisible ? text.heroLead : text.heroLead.slice(0, typed);
  const shownAccent = launcherVisible
    ? text.heroAccent
    : text.heroAccent.slice(0, Math.max(0, typed - text.heroLead.length));
  const stillTyping = !launcherVisible && typed > 0 && typed < heroPhrase.length;

  useEffect(() => {
    const previousBody = document.body.style.backgroundColor;
    const previousHtml = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = "#000";
    document.documentElement.style.backgroundColor = "#000";
    return () => {
      document.body.style.backgroundColor = previousBody;
      document.documentElement.style.backgroundColor = previousHtml;
    };
  }, []);

  useEffect(() => {
    if (launcherVisible || introGate === "checking") return;
    const phrase = `${text.heroLead}${text.heroAccent}`;
    const revealNow = () => {
      setTyped(phrase.length);
      setLauncherVisible(true);
    };
    if (introGate === "skip") {
      const frame = window.setTimeout(revealNow, 0);
      return () => window.clearTimeout(frame);
    }

    let cancelled = false;
    let count = 0;
    let timer = 0;
    const reset = window.setTimeout(() => {
      if (!cancelled) setTyped(0);
    }, 0);

    const step = () => {
      if (cancelled) return;
      count += 1;
      setTyped(count);
      if (count >= phrase.length) {
        timer = window.setTimeout(() => {
          if (!cancelled) setLauncherVisible(true);
        }, 420);
        return;
      }
      const previous = phrase[count - 1] ?? "";
      const pause = previous === " " || previous === "," ? 150 : 62;
      timer = window.setTimeout(step, pause);
    };

    timer = window.setTimeout(step, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(reset);
      window.clearTimeout(timer);
    };
  }, [introGate, launcherVisible, text.heroAccent, text.heroLead]);

  useEffect(() => {
    let cancelled = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (reduceMotion) {
      const frame = window.setTimeout(() => {
        if (!cancelled) setIntroGate("skip");
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(frame);
      };
    }

    if (!isUuid(stored)) {
      const frame = window.setTimeout(() => {
        if (!cancelled) setIntroGate("play");
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(frame);
      };
    }

    void requestDemo({ method: "GET", sessionId: stored })
      .then((session) => {
        if (cancelled) return;
        setView(session);
        if (session.phase === "awaiting_name") {
          setIntroGate("play");
          return;
        }
        setOpen(true);
        setIntroGate("skip");
      })
      .catch(() => {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        if (!cancelled) setIntroGate("play");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [view?.transcript, messages, status, open]);

  useEffect(() => {
    const current = viewRef.current;
    if (!current || current.inputMode !== "free" || status !== "ready" || messages.length === 0) return;
    let cancelled = false;
    const sessionId = current.sessionId;

    void (async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const pending = messages.some((message) => {
          const value = uiText(message);
          return Boolean(value) && !transcriptRef.current.some((turn) => turn.role === message.role && turn.text === value);
        });
        if (!pending) {
          if (!cancelled) setMessages([]);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 250 : 400));
        if (cancelled) return;
        try {
          const next = await requestDemo({ method: "GET", sessionId });
          if (cancelled) return;
          transcriptRef.current = next.transcript;
          setView(next);
        } catch {
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, setMessages, status]);

  function chooseLanguage(next: DemoLanguage) {
    if (view) return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }

  function failureMessage(statusCode: number) {
    if (statusCode === 503) {
      return language === "en"
        ? "The demo is not connected to the database yet."
        : "O demo ainda não está ligado à base de dados.";
    }
    if (statusCode === 429) {
      return language === "en"
        ? "Too many attempts. Wait a moment and try again."
        : "Demasiadas tentativas. Espera um momento e tenta novamente.";
    }
    return language === "en"
      ? "I couldn't continue right now. Try again in a moment."
      : "Não consegui continuar agora. Tenta novamente dentro de momentos.";
  }

  async function run(body: unknown) {
    setBusy(true);
    setError("");
    try {
      setView(await requestDemo({ body }));
      setInput("");
    } catch (requestError) {
      const statusCode = requestError instanceof DemoRequestError ? requestError.status : 500;
      setError(failureMessage(statusCode));
    } finally {
      setBusy(false);
    }
  }

  async function openChat() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (view) return;

    setBusy(true);
    setError("");
    try {
      setView(await requestDemo({ body: { action: "start", language } }));
    } catch (requestError) {
      const statusCode = requestError instanceof DemoRequestError ? requestError.status : 500;
      setError(failureMessage(statusCode));
    } finally {
      setBusy(false);
    }
  }

  async function submitGuided(event?: FormEvent) {
    event?.preventDefault();
    const value = input.trim();
    if (!view || !value || busy) return;
    if (view.inputMode === "name") {
      await run({ action: "name", sessionId: view.sessionId, name: value });
      return;
    }
    if (view.inputMode === "email") {
      await run({ action: "email", sessionId: view.sessionId, email: value });
    }
  }

  async function chooseSuggestion(id: string) {
    if (!view || busy) return;
    if (view.phase === "exploring") {
      await run({ action: "question", sessionId: view.sessionId, questionId: id });
      return;
    }
    if (view.phase === "awaiting_price") {
      await run({ action: "price", sessionId: view.sessionId, priceBand: id });
      return;
    }
    if (view.phase === "awaiting_interest") {
      await run({ action: "interest", sessionId: view.sessionId, interested: id === "yes" });
    }
  }

  async function submitFree(event?: FormEvent) {
    event?.preventDefault();
    const value = input.trim();
    if (!view?.freeConversationId || !value || chatBusy) return;
    setInput("");
    setError("");
    try {
      await sendMessage(
        { text: value },
        {
          body: {
            conversationId: view.freeConversationId,
            language: view.language,
            demoSessionId: view.sessionId,
          },
        },
      );
    } catch {
      setError(failureMessage(500));
    }
  }

  const liveMessages = messages.filter((message) => {
    const value = uiText(message);
    if (!value || !view) return false;
    return !view.transcript.some((turn) => turn.role === message.role && turn.text === value);
  });

  const placeholder =
    view?.inputMode === "email"
      ? text.emailPlaceholder
      : view?.inputMode === "free"
        ? text.freePlaceholder
        : text.namePlaceholder;

  const chatErrorText = chatError
    ? chatError.message.includes("rate_limited") || chatError.message.includes("chat_message_limit")
      ? failureMessage(429)
      : failureMessage(500)
    : "";

  return (
    <main className={styles.root}>
      {launcherVisible && (
      <header className={`momo-sales-topbar ${styles.reveal}`}>
        {!view && (
          <div className="momo-sales-language" role="group" aria-label={language === "en" ? "Language" : "Idioma"}>
            {(["pt", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => chooseLanguage(option)}
                className={language === option ? "is-active" : undefined}
                aria-pressed={language === option}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </header>
      )}

      <div className={styles.copy}>
        <h1 className={styles.title} aria-label={`${text.heroLead.trim()} ${text.heroAccent}`}>
          {typed > 0 && (
            <span>
              {shownLead}
              {stillTyping && typed <= text.heroLead.length && <i className={styles.caret} aria-hidden="true" />}
            </span>
          )}
          {typed > text.heroLead.length && (
            <span>
              <span className="momo-sales-title-accent">{shownAccent}</span>
              {stillTyping && <i className={styles.caret} aria-hidden="true" />}
            </span>
          )}
        </h1>
      </div>

      {launcherVisible && (
        <a className={`${styles.privacy} ${styles.reveal}`} href="/legal/privacy">
          {language === "en" ? "Privacy" : "Privacidade"}
        </a>
      )}

      {open && (
        <section className="momo-chat-panel fixed bottom-24 right-4 z-50 flex h-[min(650px,calc(100vh-120px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-[26px] border border-white/[0.085] bg-[#111]/95 shadow-[0_30px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:right-7">
          <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <MomoIcon size={36} />
              <div>
                <div className="text-sm font-semibold tracking-[-0.01em]">Momo</div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/45">
                  <span className="momo-online-dot h-1.5 w-1.5 rounded-full" />
                  {language === "en" ? "AI assistant · Online" : "Assistente de IA · Online"}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label={language === "en" ? "Close chat" : "Fechar chat"}
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-white/45 transition hover:bg-white/[0.07] hover:text-white"
            >
              <CloseGlyph />
            </button>
          </header>

          <div className="momo-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {view?.transcript.map((turn, index) => (
              <div key={`${turn.at}-${index}`} className={`flex gap-2.5 ${turn.role === "user" ? "justify-end" : ""}`}>
                {turn.role === "assistant" && <MomoIcon size={27} />}
                <div
                  className={
                    turn.role === "user"
                      ? "momo-user-message max-w-[82%] whitespace-pre-wrap rounded-[18px] rounded-br-md px-3.5 py-2.5 text-[14px] leading-5 text-[#18120d]"
                      : "max-w-[82%] whitespace-pre-wrap rounded-[18px] rounded-bl-md border border-white/[0.065] bg-white/[0.055] px-3.5 py-2.5 text-[14px] leading-5 text-[#ededed]"
                  }
                >
                  {turn.text}
                </div>
              </div>
            ))}

            {liveMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {(busy || status === "submitted") && (
              <div className="flex items-center gap-2.5">
                <MomoIcon size={27} />
                <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-md border border-white/[0.055] bg-white/[0.05] px-3.5 py-3.5">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} className="momo-typing-dot h-1.5 w-1.5 rounded-full bg-white/55" style={{ animationDelay: `${dot * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {(error || chatErrorText) && (
              <div className="rounded-xl border border-[#ff8426]/20 bg-[#ff8426]/[0.08] px-3 py-2 text-xs leading-5 text-white/80">
                {error || chatErrorText}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {view && view.inputMode === "none" && (
            <div className="border-t border-white/[0.07] p-3">
              <p className="px-1 pb-2 text-[11px] text-white/35">{text.choose}</p>
              <div className="flex flex-wrap gap-2">
                {view.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void chooseSuggestion(suggestion.id)}
                    className="momo-quick-action rounded-full px-3 py-1.5 text-xs transition disabled:opacity-40"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {view && view.inputMode !== "none" && (
            <form
              onSubmit={(event) => void (view.inputMode === "free" ? submitFree(event) : submitGuided(event))}
              className="border-t border-white/[0.07] p-3"
            >
              <div className="momo-input-shell flex items-end gap-2 rounded-[19px] p-1.5 pl-3">
                <textarea
                  rows={1}
                  value={input}
                  disabled={busy || chatBusy}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void (view.inputMode === "free" ? submitFree() : submitGuided());
                    }
                  }}
                  placeholder={placeholder}
                  className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/28 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || busy || chatBusy}
                  aria-label={language === "en" ? "Send message" : "Enviar mensagem"}
                  className="momo-send-button grid h-9 w-9 shrink-0 place-items-center rounded-[13px] text-[#18110c] transition disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {launcherVisible && (
      <div className={`${styles.reveal} fixed bottom-5 right-4 z-50 sm:bottom-7 sm:right-7`}>
          <div className={styles.launcher}>
            {!open && (
              <>
                <span className={styles.ring} aria-hidden="true" />
                <button type="button" className={styles.nudge} onClick={() => void openChat()}>
                  {text.nudge}
                </button>
              </>
            )}
            <button
              type="button"
              aria-label={open ? (language === "en" ? "Close Momo" : "Fechar Momo") : (language === "en" ? "Open Momo" : "Abrir Momo")}
              aria-expanded={open}
              onClick={() => void openChat()}
              className={`momo-launcher ${open ? "is-open" : ""}`}
            >
              <span className="momo-launcher-glow" aria-hidden="true" />
              <span className="momo-launcher-highlight" aria-hidden="true" />
              <span className="momo-launcher-icon">
                {open ? <CloseGlyph /> : <LauncherChatGlyph size={LAUNCHER_SIZE * LAUNCHER_ICON_RATIO} />}
              </span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
