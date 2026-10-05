export type ChatActionKind = "command" | "reply" | "compose";

export type ChatAction = {
  id: string;
  label: string;
  kind: ChatActionKind;
  value?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  disabledReason?: string;
};
