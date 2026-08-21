/**
 * @jest-environment jsdom
 */
import { FORCE_GUEST_KEY } from "@/constants/auth";
import {
  clearForceGuest,
  isForceGuest,
  markForceGuest,
} from "@/lib/logout-client";

describe("logout-client force-guest", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("marks and clears force-guest flag", () => {
    expect(isForceGuest()).toBe(false);
    markForceGuest();
    expect(sessionStorage.getItem(FORCE_GUEST_KEY)).toBe("1");
    expect(isForceGuest()).toBe(true);
    clearForceGuest();
    expect(isForceGuest()).toBe(false);
  });
});
