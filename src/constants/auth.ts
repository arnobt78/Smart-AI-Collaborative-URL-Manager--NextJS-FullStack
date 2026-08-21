/**
 * Auth UI constants — PORTABLE_AUTH_UI_GUIDE §2.
 * Demo accounts are for local/staging only (never production secrets).
 */

export type TestAccount = {
  id: string;
  label: string;
  email: string;
  password: string;
  image?: string | null;
};

/** Guest/demo credentials used by the sign-in Select. */
export const TEST_ACCOUNTS: TestAccount[] = [
  {
    id: "guest",
    label: "Guest User",
    email: "test@example.com",
    password: "12345678",
    image: null,
  },
];

export type UtilityNavItem = {
  href: string;
  label: string;
  /** Lucide icon name hint for ProfileDropdown */
  icon: "file-text" | "activity";
};

/** Profile dropdown utility links (keep Header + ProfileDropdown in sync). */
export const UTILITY_NAVIGATION_ITEMS: UtilityNavItem[] = [
  {
    href: "/api-docs",
    label: "API Documentation",
    icon: "file-text",
  },
  {
    href: "/api-status",
    label: "API Status",
    icon: "activity",
  },
];

/** localStorage flag — avoid Login flash before Profile on refresh (guide §3). */
export const WAS_AUTHED_KEY = "urlist:wasAuthed";

/**
 * Non-httpOnly cookie mirror of WAS_AUTHED_KEY — SSR-readable via cookies().
 * See src/lib/was-authed.ts for set/clear helpers.
 */
export const WAS_AUTHED_COOKIE = "urlist_was_authed";

/**
 * C7.7: sessionStorage — force guest Auth on next `/` paint after optimistic logout
 * even if httpOnly session_token still present until background signout lands.
 */
export const FORCE_GUEST_KEY = "urlist:forceGuest";
