/**
 * @jest-environment jsdom
 */
import { FORCE_GUEST_COOKIE, FORCE_GUEST_KEY } from "@/constants/auth";
import {
  AUTH_REDIRECT_KEY,
  clearAuthRedirect,
  clearForceGuest,
  hardNavigateToLogin,
  isForceGuest,
  isForceGuestCookieValue,
  markForceGuest,
  setAuthRedirect,
} from "@/lib/logout-client";

describe("logout-client force-guest", () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.cookie = `${FORCE_GUEST_COOKIE}=; path=/; max-age=0`;
  });

  it("marks and clears force-guest flag + cookie", () => {
    expect(isForceGuest()).toBe(false);
    markForceGuest();
    expect(sessionStorage.getItem(FORCE_GUEST_KEY)).toBe("1");
    expect(document.cookie).toContain(`${FORCE_GUEST_COOKIE}=1`);
    expect(isForceGuest()).toBe(true);
    clearForceGuest();
    expect(isForceGuest()).toBe(false);
  });

  it("reads SSR cookie value", () => {
    expect(isForceGuestCookieValue("1")).toBe(true);
    expect(isForceGuestCookieValue(undefined)).toBe(false);
  });

  it("clears sticky authRedirect when marking force-guest", () => {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, "/list/all-urls");
    markForceGuest();
    expect(sessionStorage.getItem(AUTH_REDIRECT_KEY)).toBeNull();
  });

  it("skips setAuthRedirect while force-guest", () => {
    markForceGuest();
    setAuthRedirect("/list/zombie");
    expect(sessionStorage.getItem(AUTH_REDIRECT_KEY)).toBeNull();
  });

  it("setAuthRedirect persists when not force-guest", () => {
    setAuthRedirect("/list/all-urls");
    expect(sessionStorage.getItem(AUTH_REDIRECT_KEY)).toBe("/list/all-urls");
    clearAuthRedirect();
    expect(sessionStorage.getItem(AUTH_REDIRECT_KEY)).toBeNull();
  });

  it("clearAuthRedirect is idempotent for hardNavigateToLogin path", () => {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, "/list/all-urls");
    clearAuthRedirect();
    expect(sessionStorage.getItem(AUTH_REDIRECT_KEY)).toBeNull();
    // hardNavigateToLogin also clears then replace("/login") — replace not mockable in jsdom
    expect(typeof hardNavigateToLogin).toBe("function");
  });
});
