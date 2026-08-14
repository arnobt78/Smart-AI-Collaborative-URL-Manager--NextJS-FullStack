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
