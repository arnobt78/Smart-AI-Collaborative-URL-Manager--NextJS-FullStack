import { safeInternalNextPath, loginHrefWithNext } from "@/lib/auth-redirect";

describe("auth-redirect", () => {
  it("accepts safe relative paths", () => {
    expect(safeInternalNextPath("/list/all-urls")).toBe("/list/all-urls");
    expect(safeInternalNextPath("%2Flist%2Ffoo")).toBe("/list/foo");
    expect(safeInternalNextPath("/list/x?tab=1")).toBe("/list/x?tab=1");
    expect(safeInternalNextPath("/foo/../lists")).toBe("/lists");
  });

  it("rejects open redirects and login loops", () => {
    expect(safeInternalNextPath("https://evil.com")).toBeNull();
    expect(safeInternalNextPath("//evil.com")).toBeNull();
    expect(safeInternalNextPath("%2F%2Fevil.com")).toBeNull();
    expect(safeInternalNextPath("%252F%252Fevil")).toBeNull();
    // Incomplete escape throws → null; bare residual % after stable decode
    expect(safeInternalNextPath("/%2")).toBeNull();
    expect(safeInternalNextPath("/ok%zz")).toBeNull();
    // 5× nested encode of //evil leaves residual % after MAX_DECODE_PASSES
    expect(
      safeInternalNextPath("%25252525252F%25252525252Fevil"),
    ).toBeNull();
    // Path-normalization open redirects / login-loop via ..
    expect(safeInternalNextPath("/..//evil.com")).toBeNull();
    expect(safeInternalNextPath("/..%2f%2fevil.com")).toBeNull();
    expect(safeInternalNextPath("/%2e%2e/%2f%2fevil.com")).toBeNull();
    expect(safeInternalNextPath("/%09//evil.com")).toBeNull();
    expect(safeInternalNextPath("/foo/../login")).toBeNull();
    expect(safeInternalNextPath("/lists/%2e%2e/login")).toBeNull();
    expect(safeInternalNextPath("/login")).toBeNull();
    expect(safeInternalNextPath("/Login")).toBeNull();
    expect(safeInternalNextPath("/login?next=/lists")).toBeNull();
    expect(safeInternalNextPath("\\/evil")).toBeNull();
  });

  it("builds login href with next", () => {
    expect(loginHrefWithNext("/list/all-urls")).toBe(
      "/login?next=%2Flist%2Fall-urls",
    );
    expect(loginHrefWithNext("/list/foo?tab=1")).toBe(
      "/login?next=%2Flist%2Ffoo%3Ftab%3D1",
    );
    expect(loginHrefWithNext("/")).toBe("/login");
  });
});
