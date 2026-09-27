"use client";

import { useSyncExternalStore } from "react";

type Language = "pt" | "en";

const LANGUAGE_STORAGE_KEY = "momo-language";
const LANGUAGE_CHANGE_EVENT = "momo-language-change";
const MOMO_OPEN_EVENT = "momo-sales:open";

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
  if (stored === "pt" || stored === "en") return stored;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "pt";
}

function getServerLanguage(): Language {
  return "pt";
}

const copy = {
  pt: {
    eyebrow: "Assistente de IA para organizações",
    titleLead: "Uma nova forma de",
    titleAccent: "estar disponível.",
    description:
      "O Momo conhece a tua organização e responde a quem te procura, de forma natural, 24/7.",
    capabilities: ["Atendimento", "Informação", "Suporte", "Oportunidades"],
    cta: "Falar com o Momo",
    microcopy: "Experimenta agora no chat.",
    languageLabel: "Idioma",
  },
  en: {
    eyebrow: "AI assistant for organizations",
    titleLead: "A smarter way to",
    titleAccent: "stay available.",
    description:
      "Momo understands your organization and responds naturally to the people who reach out, 24/7.",
    capabilities: ["Support", "Information", "Assistance", "Opportunities"],
    cta: "Chat with Momo",
    microcopy: "Try it in the chat.",
    languageLabel: "Language",
  },
} as const;

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MomoHero() {
  const language = useSyncExternalStore(subscribeToLanguage, getClientLanguage, getServerLanguage);
  const t = copy[language];

  function chooseLanguage(next: Language) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }

  function openMomo() {
    window.dispatchEvent(new Event(MOMO_OPEN_EVENT));
  }

  return (
    <section className="momo-sales-hero" aria-labelledby="momo-sales-title">
      <div className="momo-sales-widget-light" aria-hidden="true" />


      <header className="momo-sales-topbar">
        <div className="momo-sales-language" role="group" aria-label={t.languageLabel}>
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
      </header>

      <div className="momo-sales-copy">
        <p className="momo-sales-eyebrow">{t.eyebrow}</p>
        <h1 id="momo-sales-title" className="momo-sales-title">
          <span>{t.titleLead}</span>
          <span className="momo-sales-title-accent">{t.titleAccent}</span>
        </h1>

        <p className="momo-sales-description">{t.description}</p>

        <div className="momo-sales-capabilities" aria-label={t.capabilities.join(", ")}>
          {t.capabilities.map((item, index) => (
            <span key={item}>
              {index > 0 && <i aria-hidden="true" />}
              {item}
            </span>
          ))}
        </div>

        <button type="button" onClick={openMomo} className="momo-sales-cta">
          <span>{t.cta}</span>
          <ArrowIcon />
        </button>
        <p className="momo-sales-microcopy">{t.microcopy}</p>
      </div>
    </section>
  );
}
