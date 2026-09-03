/**
 * C7.7: Optimistic logout client helpers.
 * sessionStorage + non-httpOnly cookie so SSR and client both paint Auth
 * before httpOnly session_token is cleared (avoids React #418 + Marketing flash).
 */
import { FORCE_GUEST_COOKIE, FORCE_GUEST_KEY } from "@/constants/auth";

function writeForceGuestCookie(set: boolean): void {
  if (typeof document === "undefined") return;
  // Keep cookie attrs minimal — invalid attrs cause silent ignore in browsers.
  if (set) {
    document.cookie = `${FORCE_GUEST_COOKIE}=1; Path=/; Max-Age=86400; SameSite=Lax`;
  } else {
    document.cookie = `${FORCE_GUEST_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

/** Client: sessionStorage OR cookie (cookie also set for SSR). */
export function isForceGuest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(FORCE_GUEST_KEY) === "1") return true;
    return document.cookie
      .split(";")
      .some((c) => c.trim().startsWith(`${FORCE_GUEST_COOKIE}=1`));
  } catch {
    return false;
  }
}

/** Server: cookie from next/headers cookies(). */
export function isForceGuestCookieValue(
  value: string | undefined | null,
): boolean {
  return value === "1";
}

export function markForceGuest(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FORCE_GUEST_KEY, "1");
    writeForceGuestCookie(true);
  } catch {
    // private mode — ignore
  }
}

export function clearForceGuest(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FORCE_GUEST_KEY);
    writeForceGuestCookie(false);
  } catch {
    // ignore
  }
}

/** Hard nav to chrome-free Auth — isolated for tests (jsdom Location is non-writable). */
export function hardNavigateToLogin(): void {
  if (typeof window === "undefined") return;
  window.location.replace("/login");
}
