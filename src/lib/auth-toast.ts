/**
 * Pending auth toasts across hard redirects (window.location.href).
 * Login/logout wipe in-memory ToastProvider state — queue in sessionStorage,
 * consume once on next mount via AuthToastBridge.
 */

export const PENDING_AUTH_TOAST_KEY = "urlist:pendingAuthToast";

export type AuthToastKind = "welcome" | "welcomeSignup" | "goodbye";

export type PendingAuthToast = {
  kind: AuthToastKind;
  name: string;
};

export type AuthToastCopy = {
  title: string;
  description: string;
  variant: "success";
};

/** SSR-safe: queue toast for the next full page load. */
export function queueAuthToast(payload: PendingAuthToast): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_AUTH_TOAST_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be blocked — non-critical
  }
}

/** Read + remove pending toast (once). Returns null if none / invalid. */
export function consumeAuthToast(): PendingAuthToast | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_AUTH_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_AUTH_TOAST_KEY);
    const parsed = JSON.parse(raw) as PendingAuthToast;
    if (
      !parsed ||
      typeof parsed.name !== "string" ||
      (parsed.kind !== "welcome" &&
        parsed.kind !== "welcomeSignup" &&
        parsed.kind !== "goodbye")
    ) {
      return null;
    }
    return parsed;
  } catch {
    try {
      sessionStorage.removeItem(PENDING_AUTH_TOAST_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/** Title + description for queued auth toasts. */
export function resolveAuthToastCopy(
  payload: PendingAuthToast
): AuthToastCopy {
  const name = payload.name.trim() || "User";
  switch (payload.kind) {
    case "welcome":
      return {
        title: `Welcome back, ${name} 👋`,
        description:
          "Enjoy browsing URLs — save, organize, and share your lists anytime.",
        variant: "success",
      };
    case "welcomeSignup":
      return {
        title: `Welcome, ${name} 👋`,
        description:
          "Your account is ready. Create lists, save links, and share them with others.",
        variant: "success",
      };
    case "goodbye":
      return {
        title: `Goodbye, ${name} 👋`,
        description: "Hope to see you soon again. Your lists will be waiting.",
        variant: "success",
      };
  }
}
