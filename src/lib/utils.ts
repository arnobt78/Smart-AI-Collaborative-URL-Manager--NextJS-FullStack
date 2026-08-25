import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Absolute site origin for shareable links (SSR/client-identical).
 * Uses only NEXT_PUBLIC_* so the first paint matches hydration.
 * Prefers NEXT_PUBLIC_BASE_URL (canonical in this repo / Vercel).
 */
export function getPublicAppOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  }
  return "";
}

/** Absolute share URL for a list slug (path-only if public origin env unset). */
export function listShareUrl(slug: string): string {
  if (!slug) return "";
  const origin = getPublicAppOrigin();
  return origin ? `${origin}/list/${slug}` : `/list/${slug}`;
}

/** Prefer absolute share URL; fill origin from the browser when env is unset (client only). */
export function resolveListShareUrl(slug: string): string {
  if (!slug) return "";
  const fromEnv = listShareUrl(slug);
  if (fromEnv.startsWith("http")) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/list/${slug}`;
  }
  return fromEnv;
}

/**
 * Ensure a stored URL is absolute so Visit / window / <a> open the external site
 * (schemeless hosts like "example.vercel.app" are otherwise treated as relative paths).
 */
export function ensureAbsoluteHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

/**
 * Open an external URL in a new tab via a temporary <a target=_blank>.
 * Prefer this over window.open(..., "noopener") which breaks schemeless URLs / feature strings.
 */
export function openExternalUrl(raw: string): void {
  const href = ensureAbsoluteHttpUrl(raw);
  if (!href || typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.referrerPolicy = "no-referrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
