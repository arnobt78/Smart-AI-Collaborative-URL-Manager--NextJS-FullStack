/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/keep-warm/route";
import { isAuthorizedInternalJob } from "@/lib/jobs/authorization";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/realtime/redis";

jest.mock("@/lib/jobs/authorization", () => ({
  isAuthorizedInternalJob: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: jest.fn() },
}));
jest.mock("@/lib/realtime/redis", () => ({
  redis: { ping: jest.fn() },
}));

const authorized = isAuthorizedInternalJob as jest.Mock;
const queryRaw = prisma.$queryRaw as unknown as jest.Mock;
const ping = (redis as unknown as { ping: jest.Mock }).ping;

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
  queryRaw.mockResolvedValue([{ ok: 1 }]);
  ping.mockResolvedValue("PONG");
});

describe("GET /api/cron/keep-warm", () => {
  it("rejects unauthorized callers", async () => {
    authorized.mockResolvedValueOnce(false);
    const res = await GET(new NextRequest("http://localhost/api/cron/keep-warm"));
    expect(res.status).toBe(401);
  });

  it("pings db + redis when authorized", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/keep-warm"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe(true);
    expect(body.redis).toBe(true);
    expect(queryRaw).toHaveBeenCalled();
    expect(ping).toHaveBeenCalled();
  });
});
