/**
 * C7.7: Optimistic logout client helpers.
 * Force-guest survives hard replace("/") so Auth paints before httpOnly
 * session_token is cleared by background signout.
 */
import { FORCE_GUEST_KEY } from "@/constants/auth";

export function isForceGuest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(FORCE_GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function markForceGuest(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FORCE_GUEST_KEY, "1");
  } catch {
    // private mode — ignore
  }
}

export function clearForceGuest(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FORCE_GUEST_KEY);
  } catch {
    // ignore
  }
}
