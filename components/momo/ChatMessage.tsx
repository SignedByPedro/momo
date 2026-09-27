import type { UIMessage } from "ai";
import MomoIcon from "./MomoIcon";

type ChatMessageProps = {
  message: UIMessage;
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  if (!text) return null;

  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <MomoIcon size={27} />}
      <div
        className={[
          "max-w-[82%] whitespace-pre-wrap rounded-[18px] px-3.5 py-2.5 text-[14px] leading-5 shadow-sm",
          isUser
            ? "momo-user-message rounded-br-md text-[#18120d]"
            : "rounded-bl-md border border-white/[0.065] bg-white/[0.055] text-[#f0f0f0]",
        ].join(" ")}
      >
        {text}
      </div>
    </div>
  );
}
