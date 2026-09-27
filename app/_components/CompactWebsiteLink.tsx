import { compactConversationUrl } from './conversation-url';

export default function CompactWebsiteLink({
  url,
  clickable = true,
  className = '',
}: {
  url: string;
  clickable?: boolean;
  className?: string;
}) {
  const { label, href } = compactConversationUrl(url);
  const style = { overflowWrap: 'anywhere' as const };

  // Conversation cards are themselves links, so never nest an anchor there.
  if (!clickable || !href) {
    return <span title={url} className={className} style={style}>{label}</span>;
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={url} className={className} style={style}>
      {label}
    </a>
  );
}
