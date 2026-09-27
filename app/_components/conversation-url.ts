/**
 * Presentation only. Never use the compact label in website analysis, storage,
 * leads or other operations that need the original URL and its query string.
 */
export function compactConversationUrl(value: string): { label: string; href: string | null } {
  const original = value.trim();
  const fallback = { label: shorten(original, 64), href: null };
  if (!original) return fallback;

  const hasScheme = /^https?:\/\//i.test(original);
  // Only guess HTTPS for ordinary hostnames. Do not turn arbitrary schemes
  // or free-form text into links.
  if (!hasScheme && !/^(?:[\w-]+\.)+[a-z\d-]{2,}(?::\d{1,5})?(?:[/?#]|$)/i.test(original)) {
    return fallback;
  }

  try {
    const parsed = new URL(hasScheme ? original : `https://${original}`);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      return fallback;
    }

    const host = `${parsed.hostname.replace(/^www\./i, '')}${parsed.port ? `:${parsed.port}` : ''}`;
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return {
      // Deliberately omit the query and fragment from the *label* only.
      label: shorten(`${host}${path}`, 64),
      href: hasScheme ? original : parsed.href,
    };
  } catch {
    return fallback;
  }
}

function shorten(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
