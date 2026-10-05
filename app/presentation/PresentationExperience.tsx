"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import LauncherChatGlyph from "@/components/momo/LauncherChatGlyph";
import MomoChat from "@/components/momo/MomoChat";
import styles from "./presentation.module.css";

type Preset = {
  id: string;
  label: string;
  organization: string;
  agentName: string;
  primary: string;
  secondary: string;
  tertiary: string;
  panel: string;
  size: number;
  position: "left" | "right";
  avatar: "glyph" | "initial" | "custom";
  launcher: "momo" | "full-image";
  showPanel: boolean;
  initial?: string;
};

const CUSTOM_STATES: Preset[] = [
  {
    id: "momo-closed",
    label: "Fechado",
    organization: "A tua empresa",
    agentName: "Momo",
    primary: "#ff7a00",
    secondary: "#ff9f43",
    tertiary: "#ff4300",
    panel: "#151515",
    size: 60,
    position: "right",
    avatar: "glyph",
    launcher: "momo",
    showPanel: false,
  },
  {
    id: "momo-open",
    label: "Ícone Momo",
    organization: "A tua empresa",
    agentName: "Momo",
    primary: "#ff7a00",
    secondary: "#ff9f43",
    tertiary: "#ff4300",
    panel: "#151515",
    size: 60,
    position: "right",
    avatar: "glyph",
    launcher: "momo",
    showPanel: true,
  },
  {
    id: "initial",
    label: "Inicial",
    organization: "Lume",
    agentName: "Lia",
    primary: "#5d7cff",
    secondary: "#aab7ff",
    tertiary: "#3037a8",
    panel: "#121522",
    size: 50,
    position: "right",
    avatar: "initial",
    launcher: "momo",
    showPanel: true,
    initial: "L",
  },
  {
    id: "avatar",
    label: "Avatar",
    organization: "Norte",
    agentName: "Noa",
    primary: "#25c79a",
    secondary: "#9ff4da",
    tertiary: "#0b7864",
    panel: "#0f1816",
    size: 60,
    position: "left",
    avatar: "custom",
    launcher: "momo",
    showPanel: true,
  },
  {
    id: "full-image",
    label: "Imagem completa",
    organization: "Forma",
    agentName: "Alex",
    primary: "#e9a46f",
    secondary: "#f5d5b7",
    tertiary: "#6c4637",
    panel: "#191513",
    size: 70,
    position: "right",
    avatar: "initial",
    launcher: "full-image",
    showPanel: true,
    initial: "A",
  },
];

const STEPS = [
  { id: "intro", label: "Momo" },
  { id: "problem", label: "O problema" },
  { id: "live", label: "Ao vivo" },
  { id: "custom-0", label: "Personalização 1" },
  { id: "custom-1", label: "Personalização 2" },
  { id: "custom-2", label: "Personalização 3" },
  { id: "custom-3", label: "Personalização 4" },
  { id: "custom-4", label: "Personalização 5" },
  { id: "portal", label: "Portal" },
  { id: "lead", label: "Leads" },
  { id: "sectors", label: "Negócios" },
  { id: "setup", label: "Como funciona" },
  { id: "close", label: "Fim" },
] as const;

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v13m-5-5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4H4v4M16 4h4v4M8 20H4v-4m12 4h4v-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IllustratedAvatar({ size }: { size: number }) {
  return (
    <span className={styles.illustratedAvatar} style={{ width: size, height: size }} aria-hidden="true">
      <span className={styles.avatarHair} />
      <span className={styles.avatarFace} />
      <span className={styles.avatarShirt} />
    </span>
  );
}

function DemoAvatar({ preset, size }: { preset: Preset; size: number }) {
  if (preset.avatar === "custom") return <IllustratedAvatar size={size} />;
  return (
    <span
      className={styles.demoAvatar}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${preset.secondary}, ${preset.primary}, ${preset.tertiary})`,
      }}
    >
      {preset.avatar === "glyph" ? <LauncherChatGlyph size={size * 0.56} /> : preset.initial}
    </span>
  );
}

function LauncherContent({ preset }: { preset: Preset }) {
  if (preset.launcher === "full-image") {
    return <span className={styles.fullImageLauncherArt} aria-hidden="true"><span /><i /></span>;
  }
  if (preset.avatar === "custom") return <IllustratedAvatar size={preset.size * 0.68} />;
  if (preset.avatar === "initial") return <span>{preset.initial}</span>;
  return <LauncherChatGlyph size={preset.size * 0.62} />;
}

function DemoBrowser({ preset }: { preset: Preset }) {
  const isLight = preset.panel.toLowerCase().startsWith("#f");
  const text = isLight ? "#151515" : "#f7f7f7";
  const muted = isLight ? "rgba(21,21,21,.52)" : "rgba(255,255,255,.46)";

  return (
    <div className={styles.demoBrowser}>
      <div className={styles.browserBar}>
        <div className={styles.browserDots}><span /><span /><span /></div>
        <div className={styles.browserAddress}>{preset.organization.toLowerCase().replaceAll(" ", "")}.pt</div>
        <div className={styles.browserGhost} />
      </div>
      <div className={styles.demoSite}>
        <div className={styles.demoNav}>
          <span className={styles.demoBrand}>{preset.organization}</span>
          <span>Sobre</span><span>Serviços</span><span>Contacto</span>
        </div>
        <div className={styles.demoHeroCopy}>
          <span className={styles.demoKicker}>A tua marca. O teu espaço.</span>
          <h3>Uma experiência que continua depois do primeiro clique.</h3>
          <p>O widget adapta-se à identidade da organização sem perder aquilo que sabe fazer.</p>
        </div>
        <div
          className={`${styles.widgetDock} ${preset.position === "left" ? styles.widgetDockLeft : styles.widgetDockRight}`}
          style={{ "--widget-size": `${preset.size}px` } as CSSProperties}
        >
          {preset.showPanel && (
            <div
              className={styles.demoPanel}
              style={{
                background: preset.panel,
                color: text,
                borderColor: isLight ? "rgba(21,21,21,.10)" : "rgba(255,255,255,.09)",
              }}
            >
              <div className={styles.demoPanelHeader} style={{ borderColor: isLight ? "rgba(21,21,21,.09)" : "rgba(255,255,255,.08)" }}>
                <DemoAvatar preset={preset} size={34} />
                <div className={styles.demoPanelIdentity}>
                  <strong>{preset.agentName}</strong>
                  <span style={{ color: muted }}><i style={{ background: preset.primary }} /> Assistente de IA</span>
                </div>
                <span className={styles.demoClose} style={{ color: muted }}>×</span>
              </div>
              <div className={styles.demoMessages}>
                <div className={styles.demoMessageRow}>
                  <DemoAvatar preset={preset} size={25} />
                  <div className={styles.demoBubble} style={{ background: isLight ? "rgba(21,21,21,.06)" : "rgba(255,255,255,.065)" }}>
                    Olá! Sou {preset.agentName}. Em que posso ajudar?
                  </div>
                </div>
                <div className={`${styles.demoBubble} ${styles.demoBubbleUser}`} style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`, color: "#111" }}>
                  Queria saber mais sobre vocês.
                </div>
                <div className={styles.demoMessageRow}>
                  <DemoAvatar preset={preset} size={25} />
                  <div className={styles.demoBubble} style={{ background: isLight ? "rgba(21,21,21,.06)" : "rgba(255,255,255,.065)" }}>
                    Claro. Posso responder com base no conhecimento desta organização.
                  </div>
                </div>
              </div>
              <div className={styles.demoInput} style={{ borderColor: isLight ? "rgba(21,21,21,.10)" : "rgba(255,255,255,.09)", color: muted }}>
                Escreve uma mensagem…
                <span style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}>→</span>
              </div>
            </div>
          )}
          <div
            className={`${styles.demoLauncher} ${preset.launcher === "full-image" ? styles.demoLauncherFullImage : ""}`}
            style={{
              width: preset.size,
              height: preset.size,
              "--demo-primary": preset.primary,
              "--demo-secondary": preset.secondary,
              "--demo-tertiary": preset.tertiary,
            } as CSSProperties}
          >
            <LauncherContent preset={preset} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalShowcase({ active }: { active: boolean }) {
  const nav = ["Visão geral", "Conversas", "Leads", "Knowledge", "Agent", "Widget", "Team", "Support"];
  return (
    <div className={`${styles.portalShowcase} ${active ? styles.portalActive : ""}`}>
      <aside className={styles.portalSidebar}>
        <div className={styles.portalBrand}><span className={styles.portalMark}><LauncherChatGlyph size={20} /></span><div><strong>A tua empresa</strong><small>Portal de IA</small></div></div>
        <div className={styles.portalNav}>
          {nav.map((item, index) => <span key={item} className={index === 3 ? styles.portalNavActive : undefined}><i>{String(index + 1).padStart(2, "0")}</i>{item}</span>)}
        </div>
      </aside>
      <div className={styles.portalMain}>
        <div className={styles.portalTopbar}><span>Client Portal</span><b>OWNER</b></div>
        <div className={styles.portalHeadline}>
          <div><small>CONTROLO</small><h3>Tu controlas o resto.</h3></div>
          <span className={styles.portalStatus}><i /> Widget ativo</span>
        </div>
        <div className={styles.portalStats}>
          <article><span>Conversas</span><strong>128</strong><small>Histórico do widget</small></article>
          <article><span>Leads</span><strong>23</strong><small>Contactos captados</small></article>
          <article><span>Knowledge</span><strong>48</strong><small>Entradas ativas</small></article>
        </div>
        <div className={styles.portalWorkspace}>
          <article><span className={styles.portalWorkspaceIcon}>K</span><div><strong>Knowledge</strong><p>Atualiza FAQs e informação usada nas respostas.</p></div><b>Atualizado</b></article>
          <article><span className={styles.portalWorkspaceIcon}>Aa</span><div><strong>Agent</strong><p>Define tom, idioma, nome e comportamento.</p></div><b>Personalizar</b></article>
          <article><span className={styles.portalWorkspaceIcon}>◉</span><div><strong>Widget</strong><p>Controla aparência, tamanho, posição e instalação.</p></div><b>Editar</b></article>
        </div>
      </div>
    </div>
  );
}

function LeadStory({ active }: { active: boolean }) {
  return (
    <div className={`${styles.leadStage} ${active ? styles.isActive : ""}`}>
      <div className={styles.leadChat}>
        <div className={styles.leadHeader}><span className={styles.miniMomo}><LauncherChatGlyph size={22} /></span><div><strong>Momo</strong><small>Assistente de IA</small></div></div>
        <div className={`${styles.leadBubble} ${styles.leadBubbleA}`}>Posso ajudar-te a perceber como isto funcionaria no teu negócio.</div>
        <div className={`${styles.leadBubble} ${styles.leadBubbleB}`}>Sim, queria saber mais.</div>
        <div className={`${styles.leadBubble} ${styles.leadBubbleC}`}>Perfeito. Deixa-me o teu nome e o melhor contacto, email ou telefone, para a equipa preparar uma proposta mais concreta.</div>
        <div className={`${styles.leadBubble} ${styles.leadBubbleD}`}>Claro! Sou a Joana, joana@exemplo.pt</div>
      </div>
      <div className={styles.flowArrow}><span>→</span><small>automaticamente</small></div>
      <div id="presentation-lead-card" className={styles.leadCard}>
        <div className={styles.leadCardTop}><span>Nova lead</span><strong>Novo</strong></div>
        <h3>Joana</h3>
        <p>joana@exemplo.pt</p>
        <div className={styles.leadMeta}><span>Origem</span><strong>Widget</strong></div>
        <div className={styles.leadMeta}><span>Conversa</span><strong>Guardada</strong></div>
      </div>
    </div>
  );
}

export default function PresentationExperience() {
  const [activeId, setActiveId] = useState<string>("intro");
  const [customIndex, setCustomIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const wheelLockRef = useRef(false);
  const wheelReleaseTimerRef = useRef<number | null>(null);

  const activeIndex = useMemo(() => Math.max(0, STEPS.findIndex((step) => step.id === activeId)), [activeId]);
  const preset = CUSTOM_STATES[customIndex] ?? CUSTOM_STATES[0];

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const scrollToStep = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
    document.getElementById(STEPS[clamped].id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const elements = STEPS.map((step) => document.getElementById(step.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = (visible.target as HTMLElement).id;
        setActiveId(id);
        if (id.startsWith("custom-")) {
          const next = Number(id.replace("custom-", ""));
          if (Number.isFinite(next)) setCustomIndex(Math.max(0, Math.min(CUSTOM_STATES.length - 1, next)));
        }
      },
      { threshold: [0.45, 0.62, 0.78] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || Math.abs(event.deltaY) < 8) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [data-presentation-native-scroll]")) return;

      event.preventDefault();
      if (wheelLockRef.current) return;

      wheelLockRef.current = true;
      scrollToStep(activeIndexRef.current + (event.deltaY > 0 ? 1 : -1));
      wheelReleaseTimerRef.current = window.setTimeout(() => {
        wheelLockRef.current = false;
        wheelReleaseTimerRef.current = null;
      }, 760);
    }

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      root.removeEventListener("wheel", onWheel);
      if (wheelReleaseTimerRef.current !== null) window.clearTimeout(wheelReleaseTimerRef.current);
      wheelLockRef.current = false;
    };
  }, [scrollToStep]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button" || tag === "a" || target?.isContentEditable) return;
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        scrollToStep(activeIndex + 1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToStep(activeIndex - 1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        scrollToStep(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        scrollToStep(STEPS.length - 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, scrollToStep]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (activeId !== "lead" || window.innerWidth > 620) {
      delete root.dataset.leadFocus;
      return;
    }

    const timer = window.setTimeout(() => {
      const card = document.getElementById("presentation-lead-card");
      if (!card || rootRef.current !== root) return;

      // Temporarily relax snap while we reveal the generated lead. This keeps
      // the user inside the same presentation section without requiring a drag.
      root.dataset.leadFocus = "true";
      card.scrollIntoView({ behavior: "smooth", block: "end" });

      // Re-enable section snapping as soon as the reveal motion has finished.
      // This makes the next swipe advance directly to the following section.
      window.setTimeout(() => {
        if (rootRef.current === root) delete root.dataset.leadFocus;
      }, 900);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
      delete root.dataset.leadFocus;
    };
  }, [activeId]);

  useEffect(() => {
    if (activeId !== "live") return;

    const width = window.innerWidth;
    const openDelay = width <= 620 ? 3600 : width <= 900 ? 3000 : 2400;
    const timer = window.setTimeout(() => window.dispatchEvent(new Event("momo-sales:open")), openDelay);

    return () => window.clearTimeout(timer);
  }, [activeId]);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Fullscreen can be unavailable when the browser blocks the request.
    }
  }

  return (
    <div ref={rootRef} className={styles.presentationRoot}>
      <div className={styles.ambient} aria-hidden="true" />
      <button className={styles.fullscreenButton} type="button" onClick={() => void toggleFullscreen()} aria-label="Apresentar em ecrã inteiro"><FullscreenIcon /></button>
      <nav className={styles.progress} aria-label="Navegação da apresentação">
        {STEPS.map((step, index) => (
          <button key={step.id} type="button" onClick={() => scrollToStep(index)} className={index === activeIndex ? styles.progressActive : undefined} aria-label={step.label}><span /></button>
        ))}
      </nav>

      <section id="intro" className={`${styles.slide} ${styles.heroSlide}`} data-step>
        <div className={styles.heroOrb}><LauncherChatGlyph size={70} /></div>
        <p className={styles.eyebrow}>Assistente de IA para organizações</p>
        <h1>Momo</h1>
        <p className={styles.heroTagline}>O teu negócio, sempre disponível.</p>
        <button type="button" className={styles.scrollCue} onClick={() => scrollToStep(1)}><span>Começar</span><ArrowDownIcon /></button>
      </section>

      <section id="problem" className={styles.slide} data-step>
        <div className={styles.splitLayout}>
          <div className={styles.sectionCopy}>
            <p className={styles.eyebrow}>O problema</p>
            <h2>As perguntas não chegam só quando tens tempo.</h2>
            <p>Clientes querem respostas enquanto descobrem o teu negócio. O Momo fica no website, aprende a organização e responde no momento certo.</p>
          </div>
          <div className={styles.questionCloud} aria-hidden="true">
            <span>Quanto custa?</span><span>Estão abertos?</span><span>Como funciona?</span><span>Posso personalizar?</span><span>Fazem entregas?</span><span>Quero falar convosco.</span>
            <div className={styles.questionCenter}><LauncherChatGlyph size={44} /></div>
          </div>
        </div>
      </section>

      <section id="live" className={`${styles.slide} ${styles.liveSlide}`} data-step>
        <div className={styles.liveMockSite}>
          <div className={styles.liveMockNav}><span>Serviços</span><span>Sobre</span><span>Contacto</span></div>
          <div className={styles.liveMockCopy}><p>O Momo vive aqui.</p><h2>Não é uma imagem.<br /><span>Experimenta.</span></h2><small>O widget no canto é o Momo real.</small></div>
        </div>
        {activeId === "live" && <div className={styles.liveWidgetInteraction} data-presentation-native-scroll><MomoChat /></div>}
      </section>

      <div className={styles.customStory}>
        <div className={styles.customSticky}>
          <div className={styles.customTopline}>
            <div><p className={styles.eyebrow}>Personalização</p><h2>Um Momo. <span>A tua identidade.</span></h2></div>
            <div className={styles.presetLegend}>{CUSTOM_STATES.map((item, index) => <button key={item.id} type="button" onClick={() => scrollToStep(3 + index)} className={index === customIndex ? styles.presetActive : undefined}><i style={{ background: item.primary }} />{item.label}</button>)}</div>
          </div>
          <DemoBrowser preset={preset} />
          {customIndex === 0 ? <div className={styles.customFactsPlaceholder} /> : (
            <div className={styles.customFacts}>
              <span><b>Agente</b><small>{preset.agentName}</small></span>
              <span><b>Launcher</b><small>{preset.launcher === "full-image" ? "Imagem completa" : preset.avatar === "glyph" ? "Ícone Momo" : preset.avatar === "initial" ? "Inicial" : "Avatar"}</small></span>
              <span><b>Tamanho</b><small>{preset.size}px</small></span>
              <span><b>Posição</b><small>{preset.position === "right" ? "Direita" : "Esquerda"}</small></span>
            </div>
          )}
        </div>
        {CUSTOM_STATES.map((item, index) => (
          <section key={item.id} id={`custom-${index}`} className={styles.customSentinel} data-step aria-label={`Personalização ${item.label}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
          </section>
        ))}
      </div>

      <section id="portal" className={`${styles.slide} ${styles.afterCustomSlide} ${styles.portalSlide}`} data-step>
        <div className={styles.portalIntro}>
          <p className={styles.eyebrow}>Client Portal</p>
          <h2>O Momo é só a parte que os teus clientes veem.</h2>
          <p>Por trás do widget existe um portal onde a equipa gere conhecimento, agente, widget, conversas, leads, equipa e suporte.</p>
        </div>
        <PortalShowcase active={activeId === "portal"} />
      </section>

      <section id="lead" className={`${styles.slide} ${styles.stackSlide} ${styles.leadSlide}`} data-step>
        <div className={styles.sectionCopyCentered}>
          <p className={styles.eyebrow}>Oportunidades</p>
          <h2>Uma conversa pode tornar-se uma lead.</h2>
          <p>Quando existe interesse, o Momo pode recolher o contacto e guardar a oportunidade no Portal.</p>
        </div>
        <LeadStory active={activeId === "lead"} />
      </section>

      <section id="sectors" className={`${styles.slide} ${styles.stackSlide}`} data-step>
        <div className={styles.sectionCopyCentered}>
          <p className={styles.eyebrow}>Feito para negócios diferentes</p>
          <h2>O Momo adapta-se ao negócio.<br />Não o contrário.</h2>
          <p>Estes são exemplos, não limites.</p>
        </div>
        <div className={styles.sectorCloud} aria-label="Exemplos de setores">
          {["E-commerce", "Saúde", "Restauração", "Serviços", "Educação", "Imobiliário", "Fitness", "Beleza", "Automóvel", "Turismo", "SaaS", "Arte & Design"].map((sector, index) => (
            <span key={sector} style={{ "--sector-delay": `${index * 90}ms` } as CSSProperties}>{sector}</span>
          ))}
        </div>
      </section>

      <section id="setup" className={`${styles.slide} ${styles.stackSlide}`} data-step>
        <div className={styles.sectionCopyCentered}>
          <p className={styles.eyebrow}>Do zero ao website</p>
          <h2>Configurar. Ensinar. Personalizar. Publicar.</h2>
        </div>
        <div className={styles.timeline}>
          {["Criar cliente", "Adicionar conhecimento", "Definir o agente", "Personalizar widget", "Publicar"].map((label, index) => (
            <div key={label}><span>{index + 1}</span><b>{label}</b>{index < 4 && <i />}</div>
          ))}
        </div>
      </section>

      <section id="close" className={`${styles.slide} ${styles.closeSlide}`} data-step>
        <div className={styles.heroOrb}><LauncherChatGlyph size={70} /></div>
        <p className={styles.eyebrow}>Momo</p>
        <h2>O teu negócio.<br />O teu conhecimento.<br /><span>O teu Momo.</span></h2>
        <p className={styles.closeCopy}>Uma nova forma de estar disponível.</p>
        <button type="button" className={styles.restartButton} onClick={() => scrollToStep(0)}>Voltar ao início ↑</button>
      </section>
    </div>
  );
}
