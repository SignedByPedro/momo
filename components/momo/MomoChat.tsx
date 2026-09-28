"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ChatMessage from "./ChatMessage";
import MomoIcon from "./MomoIcon";
import LauncherChatGlyph, { LAUNCHER_ICON_RATIO } from "./LauncherChatGlyph";

type Language = "pt" | "en";

const LANGUAGE_STORAGE_KEY = "momo-language";
const LANGUAGE_CHANGE_EVENT = "momo-language-change";

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  };
}

function getClientLanguage(): Language {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "pt") return stored;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "pt";
}

function getServerLanguage(): Language {
  return "pt";
}

type ChatApiErrorCode =
  | "message_too_long"
  | "conversation_too_large"
  | "chat_message_limit"
  | "rate_limited"
  | "generic";

async function chatApiFetch(...args: Parameters<typeof fetch>) {
  const response = await fetch(...args);
  if (response.ok) return response;

  let code: string | undefined;
  try {
    const payload = (await response.clone().json()) as { code?: unknown };
    if (typeof payload.code === "string") code = payload.code;
  } catch {
    // Keep a generic error if the response is not JSON.
  }

  throw new Error(`MOMO_CHAT_ERROR:${code || "generic"}`);
}

function chatErrorCode(error: Error | undefined): ChatApiErrorCode {
  if (!error?.message.startsWith("MOMO_CHAT_ERROR:")) return "generic";
  const code = error.message.slice("MOMO_CHAT_ERROR:".length);
  if (
    code === "message_too_long" ||
    code === "conversation_too_large" ||
    code === "chat_message_limit" ||
    code === "rate_limited"
  ) {
    return code;
  }
  return "generic";
}

function friendlyChatError(error: Error | undefined, language: Language) {
  const code = chatErrorCode(error);

  if (code === "message_too_long") {
    return language === "en"
      ? "That message is too long for me to process at once. Please send it in 2 or 3 parts."
      : "Essa mensagem é demasiado longa para eu processar de uma só vez. Podes enviá-la em 2 ou 3 partes?";
  }

  if (code === "chat_message_limit" || code === "conversation_too_large") {
    return language === "en"
      ? "You've reached the message limit for this conversation. Start a new chat to continue."
      : "Atingiste o limite de mensagens desta conversa. Inicia um novo chat para continuarmos.";
  }

  if (code === "rate_limited") {
    return language === "en"
      ? "You're sending messages too quickly. Please wait a moment and try again."
      : "Estás a enviar mensagens muito rapidamente. Espera um momento e tenta novamente.";
  }

  return language === "en"
    ? "I couldn't answer right now. Please try again in a moment."
    : "Não consegui responder agora. Tenta novamente dentro de momentos.";
}

const copy = {
  pt: {
    introTitle: "Olá, sou o Momo 👋",
    subtitle: "Assistente de IA · Online",
    intro1:
      "Ajudo organizações a responder a quem as procura, prestar apoio e aproveitar melhor cada conversa.",
    intro2:
      "Se partilhares o teu website, posso analisá-lo e mostrar-te como o Momo poderia ajudar na tua organização.",
    actions: [
      "Como funciona?",
      "O que consegues fazer?",
      "Quanto custa?",
      "Tenho uma empresa",
    ],
    placeholder: "Escreve uma mensagem...",
    error: "Não consegui responder agora. Tenta novamente dentro de momentos.",
    close: "Fechar chat",
    send: "Enviar mensagem",
    openMomo: "Abrir Momo",
    closeMomo: "Fechar Momo",
    hover: "Falar com o Momo",
  },
  en: {
    introTitle: "Hi, I'm Momo 👋",
    subtitle: "AI assistant · Online",
    intro1:
      "I help organizations respond to the people who reach out, provide support and make every conversation more useful.",
    intro2:
      "Share your website and I can analyse it to show how Momo could help your organization.",
    actions: [
      "How does it work?",
      "What can you do?",
      "How much does it cost?",
      "I have a business",
    ],
    placeholder: "Write a message...",
    error: "I couldn't answer right now. Please try again in a moment.",
    close: "Close chat",
    send: "Send message",
    openMomo: "Open Momo",
    closeMomo: "Close Momo",
    hover: "Chat with Momo",
  },
} as const;

const SALES_LAUNCHER_SIZE = 60;

function CloseGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function MomoChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getClientLanguage,
    getServerLanguage,
  );
  const conversationIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages, clearError } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        fetch: chatApiFetch,
      }),
    });

  const busy = status === "submitted" || status === "streaming";
  const t = copy[language];
  const errorCode = chatErrorCode(error);
  const requiresNewChat =
    errorCode === "chat_message_limit" ||
    errorCode === "conversation_too_large";
  const errorText = error ? friendlyChatError(error, language) : t.error;

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored !== "en" && stored !== "pt") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, getClientLanguage());
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    function openMomoFromHero() {
      setOpen(true);
    }
    window.addEventListener("momo-sales:open", openMomoFromHero);
    return () =>
      window.removeEventListener("momo-sales:open", openMomoFromHero);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (launcherRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function chooseLanguage(next: Language) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }

  async function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    if (!conversationIdRef.current)
      conversationIdRef.current = crypto.randomUUID();
    await sendMessage(
      { text: value },
      { body: { conversationId: conversationIdRef.current, language } },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(input);
  }

  function startNewChat() {
    conversationIdRef.current = null;
    setInput("");
    setMessages([]);
    clearError();
  }

  return (
    <>
      {open && (
        <section
          ref={panelRef}
          className="momo-chat-panel fixed bottom-24 right-4 z-50 flex h-[min(650px,calc(100vh-120px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-[26px] border border-white/8.5 bg-[#151515]/95 shadow-[0_30px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:right-7"
        >
          <header className="relative flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
            <div className="pointer-events-none absolute inset-x-7 bottom-0 h-px bg-linear-to-r from-transparent via-[#ff8426]/25 to-transparent" />
            <div className="flex items-center gap-2.5">
              <MomoIcon size={36} />
              <div>
                <div className="text-sm font-semibold tracking-[-0.01em]">
                  Momo
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/45">
                  <span className="momo-online-dot h-1.5 w-1.5 rounded-full" />
                  {t.subtitle}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label={t.close}
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-white/45 transition duration-200 hover:bg-white/[0.07] hover:text-white active:scale-95"
            >
              <CloseGlyph />
            </button>
          </header>

          <div className="momo-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex gap-2.5">
              <MomoIcon size={27} />
              <div className="max-w-[82%] rounded-[18px] rounded-bl-md border border-white/6.5 bg-white/5.5 px-3.5 py-2.5 text-[14px] leading-5 text-[#ededed] shadow-sm">
                <p>{t.introTitle}</p>
                <p className="mt-2 text-white/80">{t.intro1}</p>
                <p className="mt-2">{t.intro2}</p>
              </div>
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pl-9">
                {t.actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => void submit(action)}
                    className="momo-quick-action rounded-full px-3 py-1.5 text-xs transition duration-200 active:scale-[0.98]"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {busy && status === "submitted" && (
              <div className="flex items-center gap-2.5">
                <MomoIcon size={27} />
                <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-md border border-white/5.5 bg-white/5 px-3.5 py-3.5">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="momo-typing-dot h-1.5 w-1.5 rounded-full bg-white/55"
                      style={{ animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-[#ff8426]/20 bg-[#ff8426]/8 px-3 py-2 text-xs leading-5 text-white/80">
                <p>{errorText}</p>
                {requiresNewChat && (
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="mt-2 rounded-lg border border-[#ff8426]/25 bg-[#ff8426]/10 px-3 py-1.5 font-medium text-white transition hover:bg-[#ff8426]/15 active:scale-[0.98]"
                  >
                    {language === "en" ? "Start new chat" : "Começar novo chat"}
                  </button>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={onSubmit}
            className="border-t border-white/[0.07] p-3"
          >
            <div className="momo-input-shell flex items-end gap-2 rounded-[19px] p-1.5 pl-3">
              <textarea
                rows={1}
                value={input}
                disabled={requiresNewChat}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit(input);
                  }
                }}
                placeholder={
                  requiresNewChat
                    ? language === "en"
                      ? "Start a new chat to continue"
                      : "Começa um novo chat para continuar"
                    : t.placeholder
                }
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/28 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy || requiresNewChat}
                aria-label={t.send}
                className="momo-send-button grid h-9 w-9 shrink-0 place-items-center rounded-[13px] text-[#18110c] transition duration-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h13M13 7l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div
              className="mt-2 flex items-center justify-center gap-1 text-[10px] text-white/28"
              aria-label="Language"
            >
              {(["pt", "en"] as Language[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseLanguage(value)}
                  className={`rounded-md px-1.5 py-0.5 uppercase transition ${language === value ? "bg-white/[0.07] text-white/65" : "hover:text-white/55"}`}
                  aria-pressed={language === value}
                >
                  {value}
                </button>
              ))}
            </div>
          </form>
        </section>
      )}

      <div
        ref={launcherRef}
        className="group fixed bottom-5 right-4 z-50 sm:bottom-7 sm:right-7"
      >
        {!open && (
          <div className="pointer-events-none absolute right-17 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full border border-white/8 bg-[#171717]/95 px-3 py-1.5 text-xs text-white/65 opacity-0 shadow-lg backdrop-blur-lg transition duration-200 group-hover:-translate-x-0.5 group-hover:opacity-100 sm:block">
            {t.hover}
          </div>
        )}
        <button
          type="button"
          aria-label={open ? t.closeMomo : t.openMomo}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`momo-launcher ${open ? "is-open" : ""}`}
        >
          <span className="momo-launcher-glow" aria-hidden="true" />
          <span className="momo-launcher-highlight" aria-hidden="true" />
          <span className="momo-launcher-icon">
            {open ? (
              <CloseGlyph />
            ) : (
              <LauncherChatGlyph
                size={SALES_LAUNCHER_SIZE * LAUNCHER_ICON_RATIO}
              />
            )}
          </span>
        </button>
      </div>
    </>
  );
}
