/** @jest-environment node */

import { isAuthorizedInternalJob } from "@/lib/jobs/authorization";

describe("REQ-0025 internal job authorization", () => {
  const originalEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.INTERNAL_JOB_SECRET;
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnvironment, configurable: true });
  });

  it("rejects an unsigned production request before job side effects", async () => {
    await expect(isAuthorizedInternalJob(new Request("https://example.test/api/jobs/check-all-urls", { method: "POST" }))).resolves.toBe(false);
  });

  it("accepts only the configured internal secret", async () => {
    process.env.INTERNAL_JOB_SECRET = "test-secret";
    const request = new Request("https://example.test/api/jobs/check-all-urls", {
      method: "POST",
      headers: { "x-internal-job-secret": "test-secret" },
    });

    await expect(isAuthorizedInternalJob(request)).resolves.toBe(true);
  });
});
