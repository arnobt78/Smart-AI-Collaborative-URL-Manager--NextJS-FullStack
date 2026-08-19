/** @jest-environment node */

import {
  listRouteParamsSchema,
  listUrlRouteParamsSchema,
  parseJsonBody,
  parseRouteParams,
  signInSchema,
} from "@/lib/api-validation";

describe("REQ-0025 shared mutation validation", () => {
  it("rejects malformed JSON before a route can continue", async () => {
    const request = new Request("http://localhost/api/auth/signin", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    const result = await parseJsonBody(request, signInSchema);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(400);
  });

  it("rejects invalid payloads without exposing schema details", async () => {
    const request = new Request("http://localhost/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
      headers: { "content-type": "application/json" },
    });

    const result = await parseJsonBody(request, signInSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({ error: "Invalid request" });
    }
  });

  it("rejects invalid bodyless mutation identifiers before authorization", () => {
    const listResult = parseRouteParams(
      { id: "invalid/id" },
      listRouteParamsSchema,
    );
    const urlResult = parseRouteParams(
      { id: "valid-list", urlId: "" },
      listUrlRouteParamsSchema,
    );

    expect(listResult.success).toBe(false);
    expect(urlResult.success).toBe(false);
    if (!listResult.success) expect(listResult.response.status).toBe(400);
    if (!urlResult.success) expect(urlResult.response.status).toBe(400);
  });
});
