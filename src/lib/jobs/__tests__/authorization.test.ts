/** @jest-environment node */

import {
  isAuthorizedInternalJob,
  isAuthorizedManualListJob,
  isAuthorizedManualScheduleSetup,
} from "@/lib/jobs/authorization";

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/list-route-access", () => ({
  resolveAuthorizedList: jest.fn(),
}));

import { getCurrentUser } from "@/lib/auth";
import { resolveAuthorizedList } from "@/lib/list-route-access";

const mockedGetCurrentUser = jest.mocked(getCurrentUser);
const mockedResolveAuthorizedList = jest.mocked(resolveAuthorizedList);

describe("REQ-0025 internal job authorization", () => {
  const originalEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.INTERNAL_JOB_SECRET;
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;
    mockedGetCurrentUser.mockReset();
    mockedResolveAuthorizedList.mockReset();
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

describe("manual list job authorization", () => {
  const originalEnvironment = process.env.NODE_ENV;
  const request = new Request("https://example.test/api/jobs/check-urls", {
    method: "POST",
  });

  beforeEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.INTERNAL_JOB_SECRET;
    mockedGetCurrentUser.mockReset();
    mockedResolveAuthorizedList.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnvironment, configurable: true });
  });

  it("rejects unauthenticated manual list job requests", async () => {
    mockedResolveAuthorizedList.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    await expect(isAuthorizedManualListJob(request, "list-id")).resolves.toBe(false);
  });

  it("accepts manual list job when user has edit access", async () => {
    mockedResolveAuthorizedList.mockResolvedValue({
      ok: true,
      list: { id: "list-id" } as never,
      user: { id: "user-id" } as never,
      role: "editor",
    });

    await expect(isAuthorizedManualListJob(request, "list-id")).resolves.toBe(true);
    expect(mockedResolveAuthorizedList).toHaveBeenCalledWith("list-id", "edit");
  });

  it("accepts manual list job via internal secret without session lookup", async () => {
    process.env.INTERNAL_JOB_SECRET = "test-secret";
    const internalRequest = new Request("https://example.test/api/jobs/check-urls", {
      method: "POST",
      headers: { "x-internal-job-secret": "test-secret" },
    });

    await expect(isAuthorizedManualListJob(internalRequest, "list-id")).resolves.toBe(true);
    expect(mockedResolveAuthorizedList).not.toHaveBeenCalled();
  });
});

describe("manual schedule setup authorization", () => {
  const originalEnvironment = process.env.NODE_ENV;
  const request = new Request("https://example.test/api/jobs/setup-schedule", {
    method: "POST",
  });

  beforeEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.INTERNAL_JOB_SECRET;
    mockedGetCurrentUser.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnvironment, configurable: true });
  });

  it("rejects unauthenticated schedule setup requests", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    await expect(isAuthorizedManualScheduleSetup(request)).resolves.toBe(false);
  });

  it("accepts schedule setup for authenticated users", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-id" } as never);

    await expect(isAuthorizedManualScheduleSetup(request)).resolves.toBe(true);
  });
});
