/**
 * Allow only same-origin relative paths for post-auth return (`?next=`).
 * Preserves a trailing hash when the path is otherwise safe.
 * Rejects protocol-relative, absolute, and backslash / encoded-backslash shapes.
 */
export function safeNextPath(next) {
  if (typeof next !== "string" || next.length === 0) {
    return null;
  }
  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  if (next.includes("\\")) {
    return null;
  }
  // Encoded backslash / protocol-relative tricks after decode.
  let decoded;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\")
  ) {
    return null;
  }
  // Reject scheme-like prefixes (e.g. "/javascript:..." is odd; bare "https://..." already failed).
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return null;
  }
  return next;
}
