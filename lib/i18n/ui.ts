export type UiLanguage = "pt" | "en";

export function tr(language: UiLanguage, pt: string, en: string) {
  return language === "en" ? en : pt;
}

export function dateLocale(language: UiLanguage) {
  return language === "en" ? "en-GB" : "pt-PT";
}

export function normalizeUiLanguage(value: unknown): UiLanguage {
  return value === "en" ? "en" : "pt";
}
