/**
 * Post-login destinations come from the query string, so they are untrusted:
 * only same-origin absolute paths are accepted ("/admin/charts"), never
 * protocol-relative ("//evil.com") or backslash tricks ("/\evil.com").
 */
export function safeNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  return raw;
}
