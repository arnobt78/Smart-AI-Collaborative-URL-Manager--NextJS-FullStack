/**
 * Robohash avatar URLs — deterministic robot portraits from any seed (usually email).
 * PORTABLE_AUTH_UI_GUIDE §2.3 / §4 — same email → same robot.
 */
export function robohashUrl(emailOrSeed: string, size = 80): string {
  const seed = encodeURIComponent(emailOrSeed.trim().toLowerCase());
  const px = Math.max(40, Math.min(size, 256));
  return `https://robohash.org/${seed}?set=set1&size=${px}x${px}`;
}

/** Display name from email local-part when User has no name column. */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "User";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
