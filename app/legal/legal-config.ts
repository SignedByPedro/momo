export type LegalLanguage = "pt" | "en";

export const legalConfig = {
  status: "draft" as "draft" | "published",
  serviceName: "Momo",
  version: "0.7",
  lastUpdated: "23/09/2026",
  effectiveDate: "A definir antes do lançamento comercial",

  // Complete these fields before switching status to "published".
  legalEntityName: "",
  registrationNumber: "",
  registeredAddress: "",
  countryOfEstablishment: "",
  privacyContact: "",
  legalContact: "",

  // Current commercial model. Exact values stay in the proposal/order form.
  commercialModelPt: "taxa inicial de setup + mensalidade recorrente",
  commercialModelEn: "initial setup fee + recurring monthly fee",

  // Operational retention defaults selected for the product. The legal pages stay
  // in draft until the corresponding deletion/review procedures are fully enforced.
  customerConversationRetentionMonths: 12,
  customerLeadRetentionMonths: 12,
  cancellationRecoveryDays: 90,
  resolvedSupportRetentionMonths: 12,
  dormantSalesLeadRetentionMonths: 12,
  rateLimitRetentionHours: 48,
  // Reserved for a future separate security-incident system (not implemented).
  futureSecurityIncidentRetentionDays: 90,
} as const;

export const legalIsPublished = legalConfig.status === "published";

export const missingLegalFields = [
  ["legalEntityName", legalConfig.legalEntityName],
  ["registrationNumber", legalConfig.registrationNumber],
  ["registeredAddress", legalConfig.registeredAddress],
  ["countryOfEstablishment", legalConfig.countryOfEstablishment],
  ["privacyContact", legalConfig.privacyContact],
  ["legalContact", legalConfig.legalContact],
]
  .filter(([, value]) => !value)
  .map(([key]) => key);

export function normalizeLegalLanguage(value: string | undefined): LegalLanguage {
  return value === "en" ? "en" : "pt";
}

export function legalEntityLabel(language: LegalLanguage) {
  if (legalConfig.legalEntityName) return legalConfig.legalEntityName;
  return language === "en"
    ? "[legal entity to be confirmed]"
    : "[entidade legal por confirmar]";
}

export function legalContactLabel(language: LegalLanguage) {
  if (legalConfig.legalContact) return legalConfig.legalContact;
  return language === "en"
    ? "[legal contact to be confirmed]"
    : "[contacto jurídico por confirmar]";
}

export function privacyContactLabel(language: LegalLanguage) {
  if (legalConfig.privacyContact) return legalConfig.privacyContact;
  return language === "en"
    ? "[privacy contact to be confirmed]"
    : "[contacto de privacidade por confirmar]";
}
