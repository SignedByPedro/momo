const REDACTED = "********";

/**
 * Remove credentials from text before it is persisted in Momo Support.
 *
 * This deliberately focuses on high-confidence secret shapes and explicit
 * credential labels. It is a final storage safeguard, not a replacement for
 * telling users not to share credentials in chat.
 */
export function redactSupportSecrets(value: string) {
  let text = value;

  // Authorization headers / bearer tokens.
  text = text.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, `Bearer ${REDACTED}`);

  // Common high-confidence API/token formats.
  text = text.replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, REDACTED);
  text = text.replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, REDACTED);
  text = text.replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, REDACTED);
  text = text.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, REDACTED);

  // Credentials embedded in URLs, e.g. https://user:password@example.com.
  text = text.replace(
    /\b(https?:\/\/[^\s/:@]+:)([^\s@/]+)(@[^\s]+)/gi,
    (_match, prefix, _secret, suffix) => `${prefix}${REDACTED}${suffix}`,
  );

  // Environment-style secrets: API_KEY=value, PASSWORD: value, etc.
  text = text.replace(
    /\b([A-Z0-9_]*(?:PASSWORD|PASSWD|PWD|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|SECRET_KEY|CLIENT_SECRET|SERVICE_ROLE_KEY)[A-Z0-9_]*)\b\s*([=:])\s*([^\s,;]+)/gi,
    (_match, label, separator) => `${label}${separator}${REDACTED}`,
  );

  // Common informal shorthand used in Portuguese/English chat. Keep the bare
  // word "pass" conservative to avoid treating the ordinary English verb as a
  // credential, but redact it when the user clearly presents a value.
  text = text.replace(
    /\b((?:(?:a|o)\s+)?(?:minha|meu)\s+pass|my\s+pass)\b(\s*(?:=|:|->|é|e|is)\s*)(["'`]?[^\s,;.!?"'`]+["'`]?)/giu,
    (_match, label, separator) => `${label}${separator}${REDACTED}`,
  );
  text = text.replace(
    /\b(pass)\b(\s*(?:=|:|->|é|e)\s*)(["'`]?[^\s,;.!?"'`]+["'`]?)/giu,
    (_match, label, separator) => `${label}${separator}${REDACTED}`,
  );

  // Natural-language labels in Portuguese and English. Only redact the first
  // value token after a clear separator/verb so ordinary discussions about a
  // password policy are preserved. Common status words are not secrets.
  const nonSecretStatusWords = new Set([
    "wrong", "incorrect", "invalid", "expired", "missing", "changed", "blocked",
    "errada", "errado", "incorreta", "incorreto", "invalida", "invalido",
    "expirada", "expirado", "alterada", "alterado", "bloqueada", "bloqueado",
    "not", "nao", "não",
  ]);
  text = text.replace(
    /\b(password|passwd|pwd|senha|palavra[- ]passe|api[ _-]?key|chave(?:\s+de)?\s+api|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|secret[ _-]?key)\b(\s*(?:=|:|->|é|e|is)\s*)(["'`]?[^\s,;.!?"'`]+["'`]?)/giu,
    (match, label, separator, candidate) => {
      const normalized = candidate.replace(/^["'`]|["'`]$/g, "").toLowerCase();
      if (nonSecretStatusWords.has(normalized)) return match;
      return `${label}${separator}${REDACTED}`;
    },
  );

  return text;
}
