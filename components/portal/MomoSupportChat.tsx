"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MomoIcon from "@/components/momo/MomoIcon";
import LauncherChatGlyph, {
  LAUNCHER_ICON_RATIO,
} from "@/components/momo/LauncherChatGlyph";
import type { UiLanguage } from "@/lib/i18n/ui";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TicketInfo = {
  id: string;
  reference: string;
};

type Props = {
  language: UiLanguage;
};

const copy = {
  pt: {
    title: "Momo Support",
    subtitle: "Assistente de IA · 24/7",
    intro:
      "Olá! Sou o Momo Support. Posso ajudar-te com o portal e, se for preciso, encaminho o pedido para a equipa.",
    placeholder: "Como posso ajudar?",
    send: "Enviar",
    close: "Fechar suporte",
    open: "Abrir Momo Support",
    quick: [
      "Como atualizo a Knowledge Base?",
      "O meu widget não aparece",
      "Quero pedir uma integração",
      "Quero falar com a equipa",
    ],
    error: "Não consegui responder agora. Tenta novamente dentro de momentos.",
    ticket: "Pedido enviado para a equipa",
    viewTicket: "Ver pedido",
    tickets: "Todos os pedidos",
    reset: "Nova conversa",
  },
  en: {
    title: "Momo Support",
    subtitle: "AI assistant · 24/7",
    intro:
      "Hi, I'm Momo Support. I can help with the portal and send a request to the team when needed.",
    placeholder: "How can I help?",
    send: "Send",
    close: "Close support",
    open: "Open Momo Support",
    quick: [
      "How do I update the Knowledge Base?",
      "My widget isn't showing",
      "I want to request an integration",
      "I want to speak to the team",
    ],
    error: "I couldn't answer right now. Please try again in a moment.",
    ticket: "Request sent to the team",
    viewTicket: "View request",
    tickets: "All requests",
    reset: "New conversation",
  },
} as const;

const SUPPORT_LAUNCHER_SIZE = 48;

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
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

function ResetIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8V4m0 0h4M5 4l3.2 3.2a7 7 0 1 1-1.1 8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MomoSupportChat({ language }: Props) {
  const t = copy[language];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const conversation = useMemo(() => messages.slice(-24), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, ticket]);

  useEffect(() => {
    function openSupport() {
      setOpen(true);
    }
    window.addEventListener("momo-support:open", openSupport);
    return () => window.removeEventListener("momo-support:open", openSupport);
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

  async function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;

    const nextMessages: ChatMessage[] = [
      ...conversation,
      { role: "user", content: value },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/portal/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          activeTicketId: ticket?.id ?? null,
        }),
      });

      if (!response.ok)
        throw new Error(`Support request failed: ${response.status}`);
      const payload = (await response.json()) as {
        reply?: unknown;
        ticket?: { id?: unknown; reference?: unknown } | null;
      };
      const reply =
        typeof payload.reply === "string" ? payload.reply.trim() : "";
      if (!reply) throw new Error("Missing support reply");

      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply },
      ]);
      if (
        payload.ticket &&
        typeof payload.ticket.id === "string" &&
        typeof payload.ticket.reference === "string"
      ) {
        setTicket({
          id: payload.ticket.id,
          reference: payload.ticket.reference,
        });
      }
    } catch (reason) {
      console.error(reason);
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(input);
  }

  function resetConversation() {
    setMessages([]);
    setTicket(null);
    setInput("");
    setError(null);
  }

  return (
    <>
      {open && (
        <section
          ref={panelRef}
          className="fixed bottom-23 right-4 z-70 flex h-[min(620px,calc(100vh-116px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-[26px] border border-white/9 bg-[#151515]/98 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:right-7"
        >
          <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <MomoIcon size={35} />
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-[11px] text-white/40">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                title={t.reset}
                aria-label={t.reset}
                className="grid h-8 w-8 place-items-center rounded-full text-white/40 transition hover:bg-white/[0.07] hover:text-white"
              >
                <ResetIcon />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="grid h-8 w-8 place-items-center rounded-full text-white/40 transition hover:bg-white/[0.07] hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex gap-2.5">
              <MomoIcon size={27} />
              <div className="max-w-[84%] rounded-[18px] rounded-bl-md border border-white/6 bg-white/5.5 px-3.5 py-2.5 text-[13px] leading-5 text-white/85">
                {t.intro}
              </div>
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pl-9">
                {t.quick.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => void submit(quick)}
                    className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 text-left text-[11px] text-white/60 transition hover:border-[#ff7a18]/35 hover:text-white"
                  >
                    {quick}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "gap-2.5"}`}
              >
                {message.role === "assistant" && <MomoIcon size={27} />}
                <div
                  className={`max-w-[84%] whitespace-pre-wrap rounded-[18px] px-3.5 py-2.5 text-[13px] leading-5 ${
                    message.role === "user"
                      ? "rounded-br-md bg-[#ff7a18] text-[#16110d]"
                      : "rounded-bl-md border border-white/6 bg-white/5.5 text-white/85"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2.5">
                <MomoIcon size={27} />
                <div className="flex gap-1.5 rounded-[18px] rounded-bl-md border border-white/6 bg-white/5 px-3.5 py-3.5">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/55"
                      style={{ animationDelay: `${dot * 130}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 px-3 py-2.5 text-xs leading-5 text-amber-100/75">
                {error}
              </div>
            )}

            {ticket && (
              <div className="rounded-2xl border border-[#ff7a18]/20 bg-[#ff7a18]/6 p-3.5">
                <p className="text-xs font-semibold text-[#ff9b50]">
                  {t.ticket}
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {ticket.reference}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/portal/support/${ticket.id}`}
                    className="rounded-lg bg-[#ff7a18] px-3 py-2 text-xs font-semibold text-[#17110d] transition hover:bg-[#ff9348]"
                  >
                    {t.viewTicket}
                  </Link>
                  <Link
                    href="/portal/support"
                    className="rounded-lg border border-white/8 px-3 py-2 text-xs text-white/55 transition hover:bg-white/5 hover:text-white"
                  >
                    {t.tickets}
                  </Link>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={onSubmit}
            className="border-t border-white/[0.07] p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/8 bg-white/4 p-2 focus-within:border-[#ff7a18]/30">
              <textarea
                value={input}
                onChange={(event) =>
                  setInput(event.target.value.slice(0, 3500))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit(input);
                  }
                }}
                rows={1}
                placeholder={t.placeholder}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/25"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-xl bg-[#ff7a18] px-3 py-2.5 text-xs font-semibold text-[#18110c] transition hover:bg-[#ff9348] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.send}
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? t.close : t.open}
        className="fixed bottom-5 right-5 z-70 flex items-center gap-2 rounded-full border border-white/10 bg-[#151515]/95 py-1 pl-1 pr-3 shadow-[0_16px_45px_rgba(0,0,0,0.42)] transition duration-200 hover:-translate-y-0.5 hover:border-[#ff7a18]/30 sm:right-7"
      >
        <span
          className={`momo-launcher momo-support-launcher-orb ${open ? "is-open" : ""}`}
          aria-hidden="true"
        >
          <span className="momo-launcher-glow" />
          <span className="momo-launcher-highlight" />
          <span className="momo-launcher-icon">
            <LauncherChatGlyph
              size={SUPPORT_LAUNCHER_SIZE * LAUNCHER_ICON_RATIO}
            />
          </span>
        </span>
        <span className="text-xs font-medium text-white/75">Support</span>
      </button>
    </>
  );
}
