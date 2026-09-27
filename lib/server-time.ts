/** A single server-side time snapshot for request-scoped status displays. */
export function getServerTimeMs(): number {
  return Date.now();
}
