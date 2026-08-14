/**
 * was-authed — SSR-readable hint that the user previously authenticated.
 * Cookie is non-httpOnly so layout/page can paint Marketing + profile skeleton
 * on hard refresh without waiting for localStorage / session RQ.
 * Keep in sync with WAS_AUTHED_KEY (localStorage) on every write/clear.
 */
import { WAS_AUTHED_COOKIE, WAS_AUTHED_KEY } from "@/constants/auth";

export { WAS_AUTHED_COOKIE };

/** Align with session_token maxAge (30 days). */
export const WAS_AUTHED_MAX_AGE_SEC = 30 * 24 * 60 * 60;

/** Options for next/headers cookieStore.set (server routes). */
export function wasAuthedCookieSetOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: WAS_AUTHED_MAX_AGE_SEC,
    path: "/",
  };
}

/** Read hint from Request cookies / cookie store value. */
export function isWasAuthedCookieValue(
  value: string | undefined | null,
): boolean {
  return value === "1";
}

/**
 * Client: write both localStorage + document.cookie.
 * Call after login/signup or when session confirms authenticated.
 */
export function setWasAuthedHintClient(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      localStorage.setItem(WAS_AUTHED_KEY, "1");
      document.cookie = `${WAS_AUTHED_COOKIE}=1; path=/; max-age=${WAS_AUTHED_MAX_AGE_SEC}; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`;
    } else {
      localStorage.removeItem(WAS_AUTHED_KEY);
      document.cookie = `${WAS_AUTHED_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch {
    // private mode / blocked storage — ignore
  }
}
