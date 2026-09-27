"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import ClientAgentAvatar from "@/components/widget/ClientAgentAvatar";
import type {
  ClientWidgetConfig,
  WidgetAvatarStyle,
  WidgetLauncherSize,
  WidgetLauncherStyle,
  WidgetPosition,
} from "@/lib/admin/widgets";

type Props = {
  config: ClientWidgetConfig;
  agentName: string;
  welcomeMessage: string;
  placeholder: string;
  primaryLanguage: "pt" | "en";
  uiLanguage?: "pt" | "en";
  panelSizeBounds: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  };
};

function normalizeHex(value: string, fallback: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback;
}

function luminance(hex: string) {
  const safe = normalizeHex(hex, "#111111").slice(1);
  const values = [0, 2, 4].map((index) => parseInt(safe.slice(index, index + 2), 16) / 255);
  const linear = values.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs text-white/45">
      {label}
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#101010] px-2.5 focus-within:border-[#ff7a18]/45">
        <span
          className="relative h-7 w-10 shrink-0 overflow-hidden rounded-md border border-white/15"
          style={{ backgroundColor: normalizeHex(value, "#000000") }}
        >
          <input
            type="color"
            value={normalizeHex(value, "#000000").toLowerCase()}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label}
          />
        </span>
        <input
          name={name}
          value={value}
          maxLength={7}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none"
          spellCheck={false}
        />
      </div>
    </label>
  );
}

function sizePixels(size: WidgetLauncherSize) {
  if (size === "small") return 50;
  if (size === "large") return 70;
  return 60;
}

function filePreview(file: File | undefined, fallback: string) {
  return file ? URL.createObjectURL(file) : fallback;
}

function LauncherAvatarContent({
  name,
  avatarStyle,
  avatarUrl,
  launcherPx,
}: {
  name: string;
  avatarStyle: WidgetAvatarStyle;
  avatarUrl: string;
  launcherPx: number;
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
        style={{ width: launcherPx * 0.68, height: launcherPx * 0.68 }}
      />
    );
  }

  if (avatarStyle === "initial" || avatarStyle === "image") {
    return (
      <span
        className="font-bold leading-none text-white drop-shadow-[0_1px_5px_rgba(0,0,0,.28)]"
        style={{ fontSize: launcherPx * 0.31 }}
      >
        {initial}
      </span>
    );
  }

  return (
    <svg
      width={launcherPx * 0.38}
      height={launcherPx * 0.38}
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
      <path d="M8 11.25h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function WidgetAppearanceEditor({
  config,
  agentName,
  welcomeMessage,
  placeholder,
  primaryLanguage,
  uiLanguage = "pt",
  panelSizeBounds,
}: Props) {
  const WIDGET_PANEL_MIN_WIDTH = panelSizeBounds.minWidth;
  const WIDGET_PANEL_MAX_WIDTH = panelSizeBounds.maxWidth;
  const WIDGET_PANEL_MIN_HEIGHT = panelSizeBounds.minHeight;
  const WIDGET_PANEL_MAX_HEIGHT = panelSizeBounds.maxHeight;

  const [primaryColor, setPrimaryColor] = useState(config.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(config.secondary_color);
  const [tertiaryColor, setTertiaryColor] = useState(config.tertiary_color);
  const [panelBackground, setPanelBackground] = useState(config.panel_background);
  const [panelWidth, setPanelWidth] = useState(config.panel_width);
  const [panelHeight, setPanelHeight] = useState(config.panel_height);
  const [position, setPosition] = useState<WidgetPosition>(config.position);
  const [launcherSize, setLauncherSize] = useState<WidgetLauncherSize>(config.launcher_size);
  const [launcherStyle, setLauncherStyle] = useState<WidgetLauncherStyle>(config.launcher_style);
  const [launcherImageUrl, setLauncherImageUrl] = useState(config.launcher_image_url ?? "");
  const [avatarStyle, setAvatarStyle] = useState<WidgetAvatarStyle>(config.avatar_style);
  const [avatarUrl, setAvatarUrl] = useState(config.avatar_url ?? "");
  const [panelRadius, setPanelRadius] = useState(config.panel_radius);
  const [hoverLabelEnabled, setHoverLabelEnabled] = useState(config.hover_label_enabled);
  const [hoverLabelText, setHoverLabelText] = useState(config.hover_label_text ?? "");
  const [hoverLabelBackground, setHoverLabelBackground] = useState(config.hover_label_background);
  const [hoverLabelTextColor, setHoverLabelTextColor] = useState(config.hover_label_text_color);
  const [open, setOpen] = useState(true);
  const [launcherHovered, setLauncherHovered] = useState(false);
  const tx = (pt: string, en: string) => (uiLanguage === "en" ? en : pt);

  useEffect(() => {
    return () => {
      if (avatarUrl.startsWith("blob:")) URL.revokeObjectURL(avatarUrl);
    };
  }, [avatarUrl]);

  useEffect(() => {
    return () => {
      if (launcherImageUrl.startsWith("blob:")) URL.revokeObjectURL(launcherImageUrl);
    };
  }, [launcherImageUrl]);

  const safePrimary = normalizeHex(primaryColor, "#FF7A18");
  const safeSecondary = normalizeHex(secondaryColor, "#FFB04A");
  const safeTertiary = normalizeHex(tertiaryColor, "#FF4D00");
  const safePanel = normalizeHex(panelBackground, "#111111");
  const safeHoverBackground = normalizeHex(hoverLabelBackground, "#171717");
  const safeHoverTextColor = normalizeHex(hoverLabelTextColor, "#B8B8B8");
  const isLightPanel = useMemo(() => luminance(safePanel) > 0.48, [safePanel]);
  const foreground = isLightPanel ? "#151515" : "#F7F7F7";
  const muted = isLightPanel ? "rgba(21,21,21,.52)" : "rgba(255,255,255,.46)";
  const border = isLightPanel ? "rgba(21,21,21,.10)" : "rgba(255,255,255,.09)";
  const assistantBubble = isLightPanel ? "rgba(21,21,21,.065)" : "rgba(255,255,255,.065)";
  const inputBackground = isLightPanel ? "rgba(21,21,21,.05)" : "rgba(255,255,255,.05)";
  const launcherPx = sizePixels(launcherSize);
  const accentIsLight = (luminance(safePrimary) + luminance(safeSecondary)) / 2 > 0.5;
  const accentText = accentIsLight ? "#151515" : "#ffffff";
  const automaticHoverLabel = primaryLanguage === "en" ? `Chat with ${agentName}` : `Falar com ${agentName}`;
  const effectiveHoverLabel = hoverLabelText.trim() || automaticHoverLabel;

  const launcherCssStyle = {
    "--widget-primary": safePrimary,
    "--widget-secondary": safeSecondary,
    "--widget-tertiary": safeTertiary,
    width: launcherPx,
    height: launcherPx,
  } as CSSProperties;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(480px,560px)]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">{tx("Cores", "Colors")}</h2>
            <p className="mt-1 text-xs leading-5 text-white/35">
              {tx("As três cores criam o movimento do botão e os principais destaques do widget.", "The three colors create the button motion and the widget’s main accents.")}
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <ColorField label={tx("Cor principal", "Primary color")} name="primaryColor" value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label={tx("Cor clara", "Light color")} name="secondaryColor" value={secondaryColor} onChange={setSecondaryColor} />
            <ColorField label={tx("Cor profunda", "Deep color")} name="tertiaryColor" value={tertiaryColor} onChange={setTertiaryColor} />
            <ColorField label={tx("Fundo da janela", "Window background")} name="panelBackground" value={panelBackground} onChange={setPanelBackground} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Launcher</h2>
            <p className="mt-1 text-xs leading-5 text-white/35">
              {tx("Escolhe entre o estilo Momo animado ou uma imagem de marca que ocupe todo o botão.", "Choose between the animated Momo style or a brand image that fills the whole button.")}
            </p>
          </div>

          <fieldset className="mt-6">
            <legend className="text-xs text-white/45">{tx("Estilo do botão", "Button style")}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ["momo", tx("Momo · gradiente animado", "Momo · animated gradient")],
                ["image", tx("Imagem completa", "Full image")],
              ] as Array<[WidgetLauncherStyle, string]>).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
                    launcherStyle === value
                      ? "border-[#ff7a18]/40 bg-[#ff7a18]/[0.07] text-white"
                      : "border-white/[0.07] bg-[#101010] text-white/55 hover:border-white/[0.12]"
                  }`}
                >
                  <input
                    type="radio"
                    name="launcherStyle"
                    value={value}
                    checked={launcherStyle === value}
                    onChange={() => setLauncherStyle(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {launcherStyle === "image" && (
            <label className="mt-5 grid gap-2 text-xs text-white/45">
              {tx("Imagem do botão", "Button image")}
              <input
                type="file"
                name="launcherImageFile"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const next = filePreview(event.target.files?.[0], config.launcher_image_url ?? "");
                  setLauncherImageUrl((current) => {
                    if (current.startsWith("blob:")) URL.revokeObjectURL(current);
                    return next;
                  });
                }}
                className="block w-full rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-2.5 text-sm text-white/55 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff7a18] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#17110c]"
              />
              <span className="text-[11px] leading-5 text-white/25">
                {tx("PNG, JPG ou WebP até 5 MB. A imagem é recortada automaticamente num círculo e ocupa 100% do botão. Para melhor resultado usa uma imagem quadrada.", "PNG, JPG or WebP up to 5 MB. The image is automatically cropped into a circle and fills 100% of the button. A square image works best.")}
              </span>
            </label>
          )}
          <input type="hidden" name="existingLauncherImageUrl" value={config.launcher_image_url ?? ""} />

          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#101010] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white/80">{tx("Texto ao passar o rato", "Hover text")}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/30">
                  {tx("Mostra uma pequena chamada junto ao botão para tornar o chat mais fácil de descobrir.", "Shows a small label next to the button to make the chat easier to discover.")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHoverLabelEnabled((value) => !value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  hoverLabelEnabled
                    ? "border-[#ff7a18]/35 bg-[#ff7a18]/[0.09] text-[#ff9a4d]"
                    : "border-white/[0.08] bg-white/[0.02] text-white/35"
                }`}
              >
                {hoverLabelEnabled ? tx("Ativo", "Enabled") : tx("Desativado", "Disabled")}
              </button>
            </div>

            <input type="hidden" name="hoverLabelEnabled" value={hoverLabelEnabled ? "true" : "false"} />
            <input type="hidden" name="hoverLabelText" value={hoverLabelText} />

            {hoverLabelEnabled ? (
              <div className="mt-4 space-y-4">
                <label className="grid gap-2 text-xs text-white/45">
                  {tx("Texto personalizado", "Custom text")} <span className="text-white/20">{tx("(opcional)", "(optional)")}</span>
                  <input
                    value={hoverLabelText}
                    maxLength={80}
                    onChange={(event) => setHoverLabelText(event.target.value)}
                    placeholder={automaticHoverLabel}
                    className="min-h-11 rounded-xl border border-white/[0.08] bg-[#151515] px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#ff7a18]/35"
                  />
                  <span className="text-[11px] leading-5 text-white/25">
                    {tx(`Se deixares vazio usamos automaticamente “${automaticHoverLabel}”.`, `If left empty, we automatically use “${automaticHoverLabel}”.`)}
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    label={tx("Fundo do hover", "Hover background")}
                    name="hoverLabelBackground"
                    value={hoverLabelBackground}
                    onChange={setHoverLabelBackground}
                  />
                  <ColorField
                    label={tx("Cor do texto", "Text color")}
                    name="hoverLabelTextColor"
                    value={hoverLabelTextColor}
                    onChange={setHoverLabelTextColor}
                  />
                </div>
              </div>
            ) : (
              <>
                <input type="hidden" name="hoverLabelBackground" value={hoverLabelBackground} />
                <input type="hidden" name="hoverLabelTextColor" value={hoverLabelTextColor} />
              </>
            )}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="text-xs text-white/45">{tx("Posição", "Position")}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["left", "right"] as WidgetPosition[]).map((value) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
                      position === value
                        ? "border-[#ff7a18]/40 bg-[#ff7a18]/[0.07] text-white"
                        : "border-white/[0.07] bg-[#101010] text-white/55 hover:border-white/[0.12]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="position"
                      value={value}
                      checked={position === value}
                      onChange={() => setPosition(value)}
                      className="sr-only"
                    />
                    {value === "left" ? tx("Esquerda", "Left") : tx("Direita", "Right")}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2 text-xs text-white/45">
              {tx("Tamanho do botão", "Button size")}
              <select
                name="launcherSize"
                value={launcherSize}
                onChange={(event) => setLauncherSize(event.target.value as WidgetLauncherSize)}
                className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none"
              >
                <option value="small">{tx("Pequeno", "Small")}</option>
                <option value="medium">{tx("Médio", "Medium")}</option>
                <option value="large">{tx("Grande", "Large")}</option>
              </select>
            </label>

            <label className="grid gap-2 text-xs text-white/45 sm:col-span-2">
              {tx("Arredondamento da janela", "Window rounding")} · {panelRadius}px
              <input
                type="range"
                name="panelRadius"
                min={16}
                max={36}
                step={1}
                value={panelRadius}
                onChange={(event) => setPanelRadius(Number(event.target.value))}
                className="accent-[#ff7a18]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{tx("Tamanho da janela de chat", "Chat window size")}</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">
                {tx(
                  "Ajusta a largura e a altura da janela aberta. O tamanho original é o mínimo permitido. Em telemóveis, a janela adapta-se automaticamente ao ecrã.",
                  "Adjust the open chat window's width and height. The original size is the minimum. On phones, the window automatically fits the screen.",
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPanelWidth(WIDGET_PANEL_MIN_WIDTH);
                setPanelHeight(WIDGET_PANEL_MIN_HEIGHT);
              }}
              className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/55 transition hover:border-[#ff7a18]/35 hover:text-[#ff9a4d]"
            >
              {tx("Tamanho original", "Original size")}
            </button>
          </div>

          <div className="mt-6 space-y-6">
            <label className="grid gap-3 text-xs text-white/45">
              <span className="flex items-center justify-between gap-3">
                <span>{tx("Largura", "Width")}</span>
                <output className="font-mono text-sm text-white/80">{panelWidth} px</output>
              </span>
              <input
                type="range"
                name="panelWidth"
                min={WIDGET_PANEL_MIN_WIDTH}
                max={WIDGET_PANEL_MAX_WIDTH}
                step={10}
                value={panelWidth}
                onChange={(event) => setPanelWidth(Number(event.target.value))}
                className="w-full accent-[#ff7a18]"
              />
              <span className="flex justify-between text-[11px] text-white/25">
                <span>{WIDGET_PANEL_MIN_WIDTH} px</span>
                <span>{WIDGET_PANEL_MAX_WIDTH} px</span>
              </span>
            </label>

            <label className="grid gap-3 text-xs text-white/45">
              <span className="flex items-center justify-between gap-3">
                <span>{tx("Altura", "Height")}</span>
                <output className="font-mono text-sm text-white/80">{panelHeight} px</output>
              </span>
              <input
                type="range"
                name="panelHeight"
                min={WIDGET_PANEL_MIN_HEIGHT}
                max={WIDGET_PANEL_MAX_HEIGHT}
                step={10}
                value={panelHeight}
                onChange={(event) => setPanelHeight(Number(event.target.value))}
                className="w-full accent-[#ff7a18]"
              />
              <span className="flex justify-between text-[11px] text-white/25">
                <span>{WIDGET_PANEL_MIN_HEIGHT} px</span>
                <span>{WIDGET_PANEL_MAX_HEIGHT} px</span>
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Avatar</h2>
            <p className="mt-1 text-xs leading-5 text-white/35">
              {tx("O avatar aparece no cabeçalho e nas mensagens. No estilo Momo também pode aparecer dentro do botão. O nome, mensagem inicial e placeholder são configurados na área Agent.", "The avatar appears in the header and messages. In Momo style it can also appear inside the button. Name, welcome message and placeholder are configured in the Agent area.")}
            </p>
          </div>

          <fieldset className="mt-6">
            <legend className="text-xs text-white/45">{tx("Estilo", "Style")}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {([
                ["chat", tx("Ícone de chat", "Chat icon")],
                ["initial", tx("Inicial do nome", "Name initial")],
                ["image", tx("Imagem própria", "Custom image")],
              ] as Array<[WidgetAvatarStyle, string]>).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
                    avatarStyle === value
                      ? "border-[#ff7a18]/40 bg-[#ff7a18]/[0.07] text-white"
                      : "border-white/[0.07] bg-[#101010] text-white/55 hover:border-white/[0.12]"
                  }`}
                >
                  <input
                    type="radio"
                    name="avatarStyle"
                    value={value}
                    checked={avatarStyle === value}
                    onChange={() => setAvatarStyle(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {avatarStyle === "image" && (
            <label className="mt-5 grid gap-2 text-xs text-white/45">
              {tx("Imagem do avatar", "Avatar image")}
              <input
                type="file"
                name="avatarFile"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const next = filePreview(event.target.files?.[0], config.avatar_url ?? "");
                  setAvatarUrl((current) => {
                    if (current.startsWith("blob:")) URL.revokeObjectURL(current);
                    return next;
                  });
                }}
                className="block w-full rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-2.5 text-sm text-white/55 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff7a18] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#17110c]"
              />
              <span className="text-[11px] leading-5 text-white/25">
                {tx("PNG, JPG ou WebP até 5 MB. Para logos, usa PNG ou WebP com transparência: o fundo transparente deixa o gradiente do widget visível.", "PNG, JPG or WebP up to 5 MB. For logos, use a transparent PNG or WebP so the widget gradient remains visible behind it.")}
              </span>
            </label>
          )}
          <input type="hidden" name="existingAvatarUrl" value={config.avatar_url ?? ""} />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
            {tx("Guardar aspeto", "Save appearance")}
          </button>
          <span className="text-xs text-white/30">{tx("O preview reage imediatamente; o widget real usará a configuração guardada.", "The preview updates immediately; the live widget will use the saved configuration.")}</span>
        </div>
      </div>

      <aside className="xl:sticky xl:top-28 xl:self-start">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">{tx("Preview ao vivo", "Live preview")}</p>
            <p className="mt-1 text-xs text-white/25">{tx("Simula o widget num website neutro.", "Simulates the widget on a neutral website.")}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/50 transition hover:text-white"
          >
            {open ? tx("Fechar chat", "Close chat") : tx("Abrir chat", "Open chat")}
          </button>
        </div>

        <div
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl"
          style={{ height: Math.max(650, panelHeight + 126) }}
        >
          <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at ${position === "right" ? "88%" : "12%"} 88%, ${safePrimary}18, transparent 32%)` }} />
          <div className="absolute left-8 top-8 h-3 w-40 rounded-full bg-white/[0.04]" />
          <div className="absolute left-8 top-16 h-2.5 w-64 rounded-full bg-white/[0.025]" />
          <div className="absolute left-8 top-24 h-2.5 w-48 rounded-full bg-white/[0.025]" />

          {open && (
            <div
              className={`absolute bottom-[92px] flex max-h-[calc(100%-108px)] max-w-[calc(100%-32px)] flex-col overflow-hidden border shadow-2xl ${position === "right" ? "right-4" : "left-4"}`}
              style={{
                width: panelWidth,
                height: panelHeight,
                background: safePanel,
                borderColor: border,
                borderRadius: panelRadius,
                color: foreground,
                boxShadow: `0 26px 70px rgba(0,0,0,.42), 0 0 50px ${safePrimary}10`,
              }}
            >
              <header className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-3">
                  <ClientAgentAvatar
                    name={agentName}
                    avatarStyle={avatarStyle}
                    avatarUrl={avatarUrl}
                    primaryColor={safePrimary}
                    secondaryColor={safeSecondary}
                    tertiaryColor={safeTertiary}
                    size={38}
                  />
                  <div>
                    <p className="text-sm font-semibold">{agentName}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: muted }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: safePrimary, boxShadow: `0 0 8px ${safePrimary}` }} />
                      {tx("Assistente de IA", "AI assistant")}
                    </p>
                  </div>
                </div>
                <span className="text-lg" style={{ color: muted }}>×</span>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-hidden px-4 py-4">
                <div className="flex gap-2.5">
                  <ClientAgentAvatar
                    name={agentName}
                    avatarStyle={avatarStyle}
                    avatarUrl={avatarUrl}
                    primaryColor={safePrimary}
                    secondaryColor={safeSecondary}
                    tertiaryColor={safeTertiary}
                    size={28}
                  />
                  <div
                    className="max-w-[82%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-5"
                    style={{ background: assistantBubble, color: foreground, border: `1px solid ${border}` }}
                  >
                    {welcomeMessage}
                  </div>
                </div>

                <div className="flex justify-end">
                  <div
                    className="max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-5"
                    style={{ background: `linear-gradient(135deg, ${safeSecondary}, ${safePrimary} 55%, ${safeTertiary})`, color: accentText }}
                  >
                    {tx("Que serviços têm disponíveis?", "What services do you offer?")}
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <ClientAgentAvatar
                    name={agentName}
                    avatarStyle={avatarStyle}
                    avatarUrl={avatarUrl}
                    primaryColor={safePrimary}
                    secondaryColor={safeSecondary}
                    tertiaryColor={safeTertiary}
                    size={28}
                  />
                  <div
                    className="max-w-[82%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-5"
                    style={{ background: assistantBubble, color: foreground, border: `1px solid ${border}` }}
                  >
                    {tx("Posso ajudar-te com a informação publicada pela empresa. Diz-me o que procuras e tento orientar-te.", "I can help using the information published by the company. Tell me what you’re looking for and I’ll try to guide you.")}
                  </div>
                </div>
              </div>

              <div className="p-3" style={{ borderTop: `1px solid ${border}` }}>
                <div className="flex items-center gap-2 rounded-[18px] p-1.5 pl-3" style={{ background: inputBackground, border: `1px solid ${border}` }}>
                  <span className="flex-1 text-sm" style={{ color: muted }}>{placeholder}</span>
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl text-[#151515]"
                    style={{ background: `linear-gradient(135deg, ${safeSecondary}, ${safePrimary})` }}
                  >
                    ↑
                  </span>
                </div>
              </div>
            </div>
          )}

          <div
            className={`absolute bottom-5 ${position === "right" ? "right-5" : "left-5"}`}
            onMouseEnter={() => setLauncherHovered(true)}
            onMouseLeave={() => setLauncherHovered(false)}
          >
            {!open && hoverLabelEnabled && (
              <div
                className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/[0.08] px-3 py-1.5 text-xs shadow-lg backdrop-blur-lg transition duration-200 ${
                  position === "right" ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"
                } ${launcherHovered ? "translate-x-0 opacity-100" : `${position === "right" ? "translate-x-1" : "-translate-x-1"} opacity-0`}`}
                style={{ background: safeHoverBackground, color: safeHoverTextColor }}
              >
                {effectiveHoverLabel}
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? tx("Fechar preview", "Close preview") : tx("Abrir preview", "Open preview")}
              className={`client-widget-launcher ${
                launcherStyle === "image" && launcherImageUrl ? "client-widget-launcher--image" : ""
              }`}
              style={launcherCssStyle}
            >
              {launcherStyle === "image" && launcherImageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={launcherImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  {open && <span className="absolute inset-0 bg-black/35" />}
                </>
              ) : (
                <span className="client-widget-launcher-shine" />
              )}
              <span className="relative z-10 grid place-items-center">
                {open ? (
                  <span className="text-xl font-light text-white drop-shadow-md">×</span>
                ) : launcherStyle === "image" && launcherImageUrl ? null : (
                  <LauncherAvatarContent
                    key={`${avatarStyle}:${avatarUrl}`}
                    name={agentName}
                    avatarStyle={avatarStyle}
                    avatarUrl={avatarUrl}
                    launcherPx={launcherPx}
                  />
                )}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
