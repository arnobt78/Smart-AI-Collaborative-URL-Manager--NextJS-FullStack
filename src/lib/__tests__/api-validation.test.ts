/** @jest-environment node */

import { parseJsonBody, signInSchema } from "@/lib/api-validation";

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
});
