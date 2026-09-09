/**
 * Safe post-auth redirect targets (C7.26 invite deep-link).
 * Only same-origin relative paths; reject open redirects and /login loops.
 */
const MAX_DECODE_PASSES = 5;
const SAFE_ORIGIN = "https://n.invalid";

export function safeInternalNextPath(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let decoded = raw.trim();
  try {
    for (let i = 0; i < MAX_DECODE_PASSES; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }
  // Residual % after stable decode = malformed / partial encoding surface
  if (decoded.includes("%")) return null;
  // Control / whitespace can normalize into protocol-relative URLs
  if (/[\u0000-\u001f\u007f]/.test(decoded) || /\s/.test(decoded)) {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("\\")) return null;

  let url: URL;
  try {
    url = new URL(decoded, SAFE_ORIGIN);
  } catch {
    return null;
  }
  // Catches /%09//evil.com and similar origin escapes
  if (url.origin !== SAFE_ORIGIN) return null;

  // Prefer URL-normalized path (collapses /foo/../login → /login)
  const path = `${url.pathname}${url.search}`;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.toLowerCase().startsWith("/login")) return null;
  if (path.includes("://")) return null;
  // Dot segments should be gone after URL resolve; reject any that remain
  if (path.split("/").some((seg) => seg === "." || seg === "..")) return null;
  return path;
}

/** Guest bounce from protected RSC → login with return path. */
export function loginHrefWithNext(pathname: string): string {
  const next = safeInternalNextPath(pathname);
  if (!next || next === "/") return "/login";
  return `/login?next=${encodeURIComponent(next)}`;
}
