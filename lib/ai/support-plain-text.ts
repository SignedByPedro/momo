export function normalizeSupportReplyText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/```[\s\S]*?```/g, (block) =>
      block
        .replace(/^```[^\n]*\n?/, "")
        .replace(/```$/, ""),
    )
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[*+]\s+/gm, "")
    .replace(/\*+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
