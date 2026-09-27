"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { FormEvent, useMemo, useState } from "react";
import ClientAgentAvatar from "@/components/widget/ClientAgentAvatar";
import type { ClientWidgetConfig } from "@/lib/admin/widgets";

type Props = {
  organizationId: string;
  agentName: string;
  welcomeMessage: string;
  placeholder: string;
  widgetConfig: ClientWidgetConfig;
  uiLanguage?: "pt" | "en";
};

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function luminance(hex: string) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex.slice(1) : "111111";
  const values = [0, 2, 4].map((index) => parseInt(safe.slice(index, index + 2), 16) / 255);
  const linear = values.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export default function AgentTestChat({
  organizationId,
  agentName,
  welcomeMessage,
  placeholder,
  widgetConfig,
  uiLanguage = "pt",
}: Props) {
  const [input, setInput] = useState("");
  const tx = (pt: string, en: string) => (uiLanguage === "en" ? en : pt);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/admin/clients/${organizationId}/agent-chat`,
    }),
  });

  const busy = status === "submitted" || status === "streaming";
  const isLight = useMemo(
    () => luminance(widgetConfig.panel_background) > 0.48,
    [widgetConfig.panel_background],
  );
  const foreground = isLight ? "#151515" : "#F7F7F7";
  const muted = isLight ? "rgba(21,21,21,.48)" : "rgba(255,255,255,.42)";
  const border = isLight ? "rgba(21,21,21,.10)" : "rgba(255,255,255,.08)";
  const surface = isLight ? "rgba(21,21,21,.06)" : "rgba(255,255,255,.065)";
  const accentIsLight =
    (luminance(widgetConfig.primary_color) + luminance(widgetConfig.secondary_color)) / 2 > 0.5;
  const accentText = accentIsLight ? "#151515" : "#ffffff";

  async function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    await sendMessage({ text: value });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(input);
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

  return (
    <div
      className="overflow-hidden border shadow-2xl"
      style={{
        background: widgetConfig.panel_background,
        color: foreground,
        borderColor: border,
        borderRadius: widgetConfig.panel_radius,
      }}
    >
      <header className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-3">
          {avatar(36)}
          <div>
            <p className="text-sm font-semibold">{agentName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: muted }}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: widgetConfig.primary_color,
                  boxShadow: `0 0 9px ${widgetConfig.primary_color}`,
                }}
              />
              {tx("Preview interno", "Internal preview")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMessages([])}
          className="rounded-lg border px-2.5 py-1.5 text-[11px] transition hover:opacity-80"
          style={{ borderColor: border, color: muted }}
        >
          Limpar
        </button>
      </header>

      <div className="h-[470px] space-y-4 overflow-y-auto px-4 py-4">
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
            <div className="flex gap-1 rounded-2xl rounded-bl-md px-3.5 py-3" style={{ background: surface }}>
              {[0, 1, 2].map((dot) => (
                <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: muted }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-xs leading-5 text-red-300">
            {tx("Não foi possível testar o agente. Confirma o terminal e a configuração da Knowledge Base.", "The agent could not be tested. Check the terminal and Knowledge Base configuration.")}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="p-3" style={{ borderTop: `1px solid ${border}` }}>
        <div
          className="flex items-end gap-2 rounded-[18px] border p-1.5 pl-3"
          style={{ borderColor: border, background: surface }}
        >
          <textarea
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit(input);
              }
            }}
            placeholder={placeholder}
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:opacity-40"
            style={{ color: foreground }}
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#151515] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
            style={{ background: `linear-gradient(135deg, ${widgetConfig.secondary_color}, ${widgetConfig.primary_color})` }}
            aria-label={tx("Enviar mensagem", "Send message")}
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}
