"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import ClientAgentAvatar from "@/components/widget/ClientAgentAvatar";
import type {
  ClientWidgetConfig,
  WidgetAvatarStyle,
  WidgetLauncherSize,
} from "@/lib/admin/widgets";

type Props = {
  publicKey: string;
  organizationName: string;
  primaryLanguage: "pt" | "en";
  agentName: string;
  welcomeMessage: string;
  placeholder: string;
  widgetConfig: ClientWidgetConfig;
};

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

function friendlyChatError(error: Error | undefined, language: "pt" | "en") {
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

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function luminance(hex: string) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex.slice(1) : "111111";
  const values = [0, 2, 4].map(
    (index) => parseInt(safe.slice(index, index + 2), 16) / 255,
  );
  const linear = values.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function sizePixels(size: WidgetLauncherSize) {
  if (size === "small") return 50;
  if (size === "large") return 70;
  return 60;
}

function ChatGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="text-white"
      aria-hidden="true"
    >
      <path
        d="M7.25 5.75h9.5A3.25 3.25 0 0 1 20 9v4.5a3.25 3.25 0 0 1-3.25 3.25h-4.7l-3.8 2.5v-2.5h-1A3.25 3.25 0 0 1 4 13.5V9a3.25 3.25 0 0 1 3.25-3.25Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 11.25h8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LauncherAvatar({
  name,
  avatarStyle,
  avatarUrl,
  size,
}: {
  name: string;
  avatarStyle: WidgetAvatarStyle;
  avatarUrl: string | null;
  size: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  if (avatarStyle === "image" && avatarUrl && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        onError={() => setImageFailed(true)}
        className="object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,.28)]"
        style={{ width: size * 0.68, height: size * 0.68 }}
      />
    );
  }

  if (avatarStyle === "initial" || avatarStyle === "image") {
    return (
      <span
        className="font-bold leading-none text-white drop-shadow-[0_1px_5px_rgba(0,0,0,.28)]"
        style={{ fontSize: size * 0.31 }}
      >
        {initial}
      </span>
    );
  }

  return <ChatGlyph size={size * 0.38} />;
}

export default function EmbeddedClientWidget({
  publicKey,
  organizationName,
  primaryLanguage,
  agentName,
  welcomeMessage,
  placeholder,
  widgetConfig,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [launcherHovered, setLauncherHovered] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/widget/${encodeURIComponent(publicKey)}/chat`,
      fetch: chatApiFetch,
    }),
  });

  const busy = status === "submitted" || status === "streaming";
  const errorCode = chatErrorCode(error);
  const requiresNewChat =
    errorCode === "chat_message_limit" || errorCode === "conversation_too_large";
  const isLight = useMemo(
    () => luminance(widgetConfig.panel_background) > 0.48,
    [widgetConfig.panel_background],
  );
  const foreground = isLight ? "#151515" : "#F7F7F7";
  const muted = isLight ? "rgba(21,21,21,.48)" : "rgba(255,255,255,.42)";
  const border = isLight ? "rgba(21,21,21,.10)" : "rgba(255,255,255,.085)";
  const surface = isLight ? "rgba(21,21,21,.06)" : "rgba(255,255,255,.06)";
  const accentIsLight =
    (luminance(widgetConfig.primary_color) +
      luminance(widgetConfig.secondary_color)) /
      2 >
    0.5;
  const accentText = accentIsLight ? "#151515" : "#ffffff";
  const launcherPx = sizePixels(widgetConfig.launcher_size);
  const automaticHoverLabel =
    primaryLanguage === "en" ? `Chat with ${agentName}` : `Falar com ${agentName}`;
  const hoverLabel = widgetConfig.hover_label_text?.trim() || automaticHoverLabel;
  const showHoverLabel = widgetConfig.hover_label_enabled && !open;

  const launcherStyle = {
    "--widget-primary": widgetConfig.primary_color,
    "--widget-secondary": widgetConfig.secondary_color,
    "--widget-tertiary": widgetConfig.tertiary_color,
    width: launcherPx,
    height: launcherPx,
  } as CSSProperties;

  useEffect(() => {
    window.parent.postMessage(
      {
        type: "momo:widget-state",
        key: publicKey,
        open,
        position: widgetConfig.position,
        launcherSize: launcherPx,
        panelWidth: widgetConfig.panel_width,
        panelHeight: widgetConfig.panel_height,
        launcherHovered: showHoverLabel && launcherHovered,
        hoverLabelLength: hoverLabel.length,
        hoverLabelText: showHoverLabel ? hoverLabel : "",
        hoverLabelEnabled: showHoverLabel,
        hoverLabelBackground: widgetConfig.hover_label_background,
        hoverLabelTextColor: widgetConfig.hover_label_text_color,
      },
      "*",
    );
  }, [
    launcherHovered,
    launcherPx,
    open,
    publicKey,
    showHoverLabel,
    hoverLabel,
    widgetConfig.position,
    widgetConfig.panel_width,
    widgetConfig.panel_height,
    widgetConfig.hover_label_background,
    widgetConfig.hover_label_text_color,
  ]);

  useEffect(() => {
    if (!open) return;

    // Let the host iframe expand first, then animate the panel. This avoids
    // the panel being reflowed inside an iframe whose dimensions are changing.
    const timer = window.setTimeout(() => setPanelVisible(true), 24);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (launcherRef.current?.contains(target)) return;
      setPanelVisible(false);
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    function handleParentMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      const data = event.data;
      if (!data || data.type !== "momo:close-widget" || data.key !== publicKey) return;
      setPanelVisible(false);
      setOpen(false);
    }

    window.addEventListener("message", handleParentMessage);
    return () => window.removeEventListener("message", handleParentMessage);
  }, [publicKey]);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    if (!conversationIdRef.current) conversationIdRef.current = crypto.randomUUID();
    await sendMessage(
      { text: value },
      { body: { conversationId: conversationIdRef.current } },
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

  const avatar = (size: number) => (
    <ClientAgentAvatar
      name={agentName}
      avatarStyle={widgetConfig.avatar_style}
      avatarUrl={widgetConfig.avatar_url}
      primaryColor={widgetConfig.primary_color}
      secondaryColor={widgetConfig.secondary_color}
      tertiaryColor={widgetConfig.tertiary_color}
      size={size}
    />
  );

  const errorText = friendlyChatError(error, primaryLanguage);

  return (
    <main className="momo-embed-root relative h-screen w-screen overflow-hidden bg-transparent">
      {open && panelVisible && (
        <section
          ref={panelRef}
          className={`client-widget-panel absolute bottom-[92px] flex max-h-[calc(100vh-108px)] max-w-[calc(100vw-20px)] flex-col overflow-hidden border ${
            widgetConfig.position === "right" ? "right-2.5" : "left-2.5"
          }`}
          style={{
            width: widgetConfig.panel_width,
            height: widgetConfig.panel_height,
            transformOrigin:
              widgetConfig.position === "right"
                ? "calc(100% - 28px) 100%"
                : "28px 100%",
            background: widgetConfig.panel_background,
            color: foreground,
            borderColor: border,
            borderRadius: widgetConfig.panel_radius,
            boxShadow: `0 10px 22px rgba(0,0,0,.20), 0 0 14px ${widgetConfig.primary_color}0A`,
          }}
        >
          <header
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: `1px solid ${border}` }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {avatar(36)}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{agentName}</p>
                <p
                  className="mt-0.5 flex items-center gap-1.5 text-[11px]"
                  style={{ color: muted }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: widgetConfig.primary_color,
                      boxShadow: `0 0 9px ${widgetConfig.primary_color}`,
                    }}
                  />
                  {primaryLanguage === "en" ? "AI assistant" : "Assistente de IA"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setPanelVisible(false); setOpen(false); }}
              className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:opacity-70"
              style={{ color: muted }}
              aria-label={primaryLanguage === "en" ? "Close chat" : "Fechar chat"}
            >
              ×
            </button>
          </header>

          <div className="momo-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex gap-2.5">
              {avatar(28)}
              <div
                className="max-w-[84%] whitespace-pre-wrap rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm leading-5"
                style={{ background: surface, borderColor: border, color: foreground }}
              >
                {welcomeMessage}
              </div>
            </div>

            {messages.map((message) => {
              const text = messageText(message);
              if (!text) return null;
              const user = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex gap-2.5 ${user ? "justify-end" : "justify-start"}`}
                >
                  {!user && avatar(28)}
                  <div
                    className="max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-5"
                    style={
                      user
                        ? {
                            background: `linear-gradient(135deg, ${widgetConfig.secondary_color}, ${widgetConfig.primary_color} 55%, ${widgetConfig.tertiary_color})`,
                            color: accentText,
                            borderBottomRightRadius: 6,
                          }
                        : {
                            background: surface,
                            border: `1px solid ${border}`,
                            color: foreground,
                            borderBottomLeftRadius: 6,
                          }
                    }
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {status === "submitted" && (
              <div className="flex items-center gap-2.5">
                {avatar(28)}
                <div
                  className="flex gap-1 rounded-2xl rounded-bl-md px-3.5 py-3"
                  style={{ background: surface }}
                >
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="momo-typing-dot h-1.5 w-1.5 rounded-full"
                      style={{ background: muted, animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl border px-3 py-2 text-xs leading-5"
                style={{
                  borderColor: `${widgetConfig.primary_color}33`,
                  background: `${widgetConfig.primary_color}12`,
                  color: foreground,
                }}
              >
                <p>{errorText}</p>
                {requiresNewChat && (
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="mt-2 rounded-lg border px-3 py-1.5 font-medium transition hover:brightness-110 active:scale-[0.98]"
                    style={{
                      borderColor: `${widgetConfig.primary_color}44`,
                      background: `${widgetConfig.primary_color}18`,
                      color: foreground,
                    }}
                  >
                    {primaryLanguage === "en" ? "Start new chat" : "Começar novo chat"}
                  </button>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={onSubmit}
            className="p-3"
            style={{ borderTop: `1px solid ${border}` }}
          >
            <div
              className="flex items-end gap-2 rounded-[18px] border p-1.5 pl-3"
              style={{ borderColor: border, background: surface }}
            >
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
                    ? primaryLanguage === "en"
                      ? "Start a new chat to continue"
                      : "Começa um novo chat para continuar"
                    : placeholder
                }
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:opacity-40 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: foreground }}
              />
              <button
                type="submit"
                disabled={!input.trim() || busy || requiresNewChat}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#151515] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  background: `linear-gradient(135deg, ${widgetConfig.secondary_color}, ${widgetConfig.primary_color})`,
                }}
                aria-label={primaryLanguage === "en" ? "Send message" : "Enviar mensagem"}
              >
                ↑
              </button>
            </div>
            <p className="mt-2 truncate text-center text-[9px]" style={{ color: muted }}>
              {organizationName}
            </p>
          </form>
        </section>
      )}

      <div
        ref={launcherRef}
        className={`absolute bottom-4 ${widgetConfig.position === "right" ? "right-4" : "left-4"}`}
        onMouseEnter={() => setLauncherHovered(true)}
        onMouseLeave={() => setLauncherHovered(false)}
      >
        <button
          type="button"
          onClick={() => { if (open) setPanelVisible(false); setOpen(!open); }}
          aria-label={open ? (primaryLanguage === "en" ? `Close ${agentName}` : `Fechar ${agentName}`) : (primaryLanguage === "en" ? `Open ${agentName}` : `Abrir ${agentName}`)}
          aria-expanded={open}
          className={`client-widget-launcher ${
            widgetConfig.launcher_style === "image" && widgetConfig.launcher_image_url
              ? "client-widget-launcher--image"
              : ""
          }`}
          style={launcherStyle}
        >
          {widgetConfig.launcher_style === "image" && widgetConfig.launcher_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={widgetConfig.launcher_image_url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              />
              {open && <span className="absolute inset-0 bg-black/35" aria-hidden="true" />}
            </>
          ) : (
            <span className="client-widget-launcher-shine" aria-hidden="true" />
          )}
          <span className="relative z-10 grid place-items-center">
            {open ? (
              <span className="text-xl font-light text-white drop-shadow-md">×</span>
            ) : widgetConfig.launcher_style === "image" && widgetConfig.launcher_image_url ? null : (
              <LauncherAvatar
                key={`${widgetConfig.avatar_style}:${widgetConfig.avatar_url ?? ""}`}
                name={agentName}
                avatarStyle={widgetConfig.avatar_style}
                avatarUrl={widgetConfig.avatar_url}
                size={launcherPx}
              />
            )}
          </span>
        </button>
      </div>
    </main>
  );
}
