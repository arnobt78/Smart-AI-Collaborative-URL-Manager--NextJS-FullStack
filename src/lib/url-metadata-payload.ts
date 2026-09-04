/**
 * Sanitize URL metadata before POST/PATCH so Zod createUrlSchema accepts it.
 * Prefetch/AI often leave null or relative image/favicon that fail .url().
 */

import type { UrlMetadata } from "@/utils/urlMetadata";

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function trimText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

/** Drop null/empty/relative fields; return undefined if nothing usable remains. */
export function sanitizeUrlMetadataForApi(
  meta: unknown,
): UrlMetadata | undefined {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return undefined;
  }
  const raw = meta as Record<string, unknown>;
  const out: UrlMetadata = {};

  const title = trimText(raw.title, 500);
  if (title) out.title = title;

  const description = trimText(raw.description, 10_000);
  if (description) out.description = description;

  const siteName = trimText(raw.siteName, 500);
  if (siteName) out.siteName = siteName;

  if (typeof raw.image === "string" && isAbsoluteHttpUrl(raw.image)) {
    out.image = raw.image.trim().slice(0, 2_048);
  }
  if (typeof raw.favicon === "string" && isAbsoluteHttpUrl(raw.favicon)) {
    out.favicon = raw.favicon.trim().slice(0, 2_048);
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Only clear React Query url-metadata when no remaining list item shares that URL.
 * Duplicates share the same metadata key; wiping on one delete blanks the others.
 */
export function shouldClearUrlMetadataCache(
  urls: ReadonlyArray<{ id: string; url: string }>,
  deletedUrlId: string,
  deletedUrl: string,
): boolean {
  return !urls.some((u) => u.id !== deletedUrlId && u.url === deletedUrl);
}
