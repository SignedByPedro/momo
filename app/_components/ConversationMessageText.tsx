import { compactConversationUrl } from './conversation-url';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,!?;:\]]+$/;

function separateLinkPunctuation(token: string): [string, string] {
  let end = token.length;
  while (end > 0 && TRAILING_PUNCTUATION.test(token[end - 1])) end--;

  // A closing parenthesis is punctuation only if it is not balanced by an
  // opening parenthesis inside the URL (e.g. Wikipedia article URLs).
  while (end > 0 && token[end - 1] === ")") {
    const part = token.slice(0, end);
    const opens = (part.match(/\(/g) ?? []).length;
    const closes = (part.match(/\)/g) ?? []).length;
    if (closes <= opens) break;
    end--;
  }

  return [token.slice(0, end), token.slice(end)];
}

/** Render the complete stored message, but show a short clickable URL label. */
export default function ConversationMessageText({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const match of content.matchAll(URL_PATTERN)) {
    const index = match.index;
    if (index > lastEnd) parts.push(content.slice(lastEnd, index));

    const token = match[0];
    const [rawUrl, suffix] = separateLinkPunctuation(token);
    const { label, href } = compactConversationUrl(rawUrl);
    if (href) {
      parts.push(
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={rawUrl}
          className="underline decoration-current/35 underline-offset-2 hover:decoration-current"
        >
          {label}
        </a>,
      );
    } else {
      parts.push(rawUrl);
    }
    if (suffix) parts.push(suffix);
    lastEnd = index + token.length;
  }

  if (lastEnd < content.length) parts.push(content.slice(lastEnd));
  return <p className="whitespace-pre-wrap" style={{ overflowWrap: 'anywhere' }}>{parts}</p>;
}
