export type ConversationMode = "sales" | "lead_capture" | "human_handoff";

export type ConversationStage =
  | "discovery"
  | "business_known"
  | "website_received"
  | "lead_requested"
  | "lead_ready";

export type SupportedLanguage = "pt" | "en";

export type LeadInfo = {
  name: string | null;
  email: string | null;
  phone: string | null;
  hasContact: boolean;
};

export type ConversationState = {
  mode: ConversationMode;
  stage: ConversationStage;
  language: SupportedLanguage;
  businessType: string | null;
  website: string | null;
  lead: LeadInfo;
};
