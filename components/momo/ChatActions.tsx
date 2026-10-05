import type { ChatAction } from "@/lib/chat/actions";

type Props = {
  actions: ChatAction[];
  busy?: boolean;
  onAction: (action: ChatAction) => void;
};

export default function ChatActions({ actions, busy = false, onAction }: Props) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Chat actions">
      {actions.slice(0, 3).map((action) => {
        const disabled = busy || action.disabled;
        const primary = action.variant === "primary";
        return (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            title={disabled ? action.disabledReason : undefined}
            onClick={() => onAction(action)}
            className={
              primary
                ? "rounded-xl bg-[#ff7a18] px-3 py-2 text-xs font-semibold text-[#18110c] transition hover:bg-[#ff9348] disabled:cursor-not-allowed disabled:opacity-45"
                : "rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-xs font-medium text-white/65 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            }
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
