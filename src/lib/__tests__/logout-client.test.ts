/**
 * @jest-environment jsdom
 */
import { FORCE_GUEST_COOKIE, FORCE_GUEST_KEY } from "@/constants/auth";
import {
  clearForceGuest,
  isForceGuest,
  isForceGuestCookieValue,
  markForceGuest,
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
});
