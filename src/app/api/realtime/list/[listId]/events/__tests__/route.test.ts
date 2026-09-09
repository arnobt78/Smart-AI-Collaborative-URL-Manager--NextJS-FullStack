/** @jest-environment node */
// REQ-0053: cache-ready realtime streams must not disclose list data to outsiders.
import { NextRequest } from "next/server";
import { GET } from "@/app/api/realtime/list/[listId]/events/route";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/realtime/redis";

jest.mock("@/lib/list-route-access", () => ({
  resolveAuthorizedList: jest.fn(),
}));
jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: jest.fn() },
}));
jest.mock("@/lib/realtime/redis", () => ({
  redis: { lrange: jest.fn() },
  CHANNELS: {
    listUpdate: (id: string) => `list:${id}:update`,
    listComment: (id: string) => `list:${id}:comment`,
    listActivity: (id: string) => `list:${id}:activity`,
  },
}));

const resolveAccess = resolveAuthorizedList as jest.Mock;
const currentUser = getCurrentUser as jest.Mock;
const queryRaw = prisma.$queryRaw as unknown as jest.Mock;
const lrange = (redis as unknown as { lrange: jest.Mock }).lrange;

const allowed = {
  ok: true,
  list: { id: "list-1" },
  user: { id: "user-1", email: "owner@example.test" },
  role: "owner",
};

const slimOwnerRow = {
  id: "list-1",
  slug: "warm",
  title: "Authoritative",
  isPublic: true,
  userId: "user-1",
  collaborators: [] as string[],
  collaboratorRoles: null,
  urlCount: 2,
};

async function readEvent(response: Response) {
  const reader = response.body!.getReader();
  await reader.read(); // connected event
  return reader;
}

beforeEach(() => {
  jest.clearAllMocks();
  resolveAccess.mockResolvedValue(allowed);
  currentUser.mockResolvedValue({ id: "user-1", email: "owner@example.test" });
  lrange.mockResolvedValue([]);
  queryRaw.mockResolvedValue([slimOwnerRow]);
});

describe("GET /api/realtime/list/[listId]/events", () => {
  it.each([
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [404, "List not found"],
  ])("rejects an unavailable stream with %s", async (status, error) => {
    resolveAccess.mockResolvedValueOnce({ ok: false, status, error });
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events"),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    expect(response.status).toBe(status);
  });

  it.each(["owner", "editor", "viewer"])("opens a same-origin stream for an authorized %s", async (role) => {
    resolveAccess.mockResolvedValueOnce({ ...allowed, role });
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    abort.abort();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("enriches an authorized queued mutation with a lean list summary (no urls array)", async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);
    const ts = new Date(base + 100).toISOString();
    lrange
      .mockResolvedValueOnce([
        JSON.stringify({
          type: "list_updated",
          listId: "list-1",
          action: "url_updated",
          timestamp: ts,
        }),
      ])
      .mockResolvedValue([]);
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    await jest.advanceTimersByTimeAsync(1500);
    const value = new TextDecoder().decode((await next).value);
    expect(value).toContain('"title":"Authoritative"');
    expect(value).toContain('"urlCount":2');
    expect(value).not.toContain('"urls":');
    expect(resolveAccess).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalled();
    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("does not disclose list data when access is revoked after subscription", async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);
    // Connect ok; enrich session gone (revoked cookie / signed out).
    currentUser.mockResolvedValueOnce(null);
    const ts = new Date(base + 100).toISOString();
    lrange
      .mockResolvedValueOnce([
        JSON.stringify({
          type: "list_updated",
          listId: "list-1",
          action: "url_updated",
          timestamp: ts,
        }),
      ])
      .mockResolvedValue([]);
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    await jest.advanceTimersByTimeAsync(1500);
    const value = new TextDecoder().decode((await next).value);
    expect(value).toContain('"type":"unauthorized"');
    expect(value).not.toContain('"list":');
    expect(queryRaw).not.toHaveBeenCalled();
    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("does not disclose Redis backlog payloads when the list row is already deleted", async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);
    queryRaw.mockResolvedValueOnce([]);
    const ts = new Date(base + 100).toISOString();
    lrange
      .mockResolvedValueOnce([
        JSON.stringify({
          type: "activity_created",
          listId: "list-1",
          action: "url_updated",
          timestamp: ts,
          activity: {
            id: "act-1",
            action: "url_updated",
            details: { title: "Secret URL Title" },
            createdAt: ts,
            user: { id: "user-1", email: "owner@example.test" },
          },
        }),
      ])
      .mockResolvedValue([]);
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    await jest.advanceTimersByTimeAsync(1500);
    const value = new TextDecoder().decode((await next).value);
    expect(value).toContain('"deleted":true');
    expect(value).not.toContain("Secret URL Title");
    expect(value).not.toContain('"activity"');
    expect(value).not.toContain("owner@example.test");
    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("emits two distinct same-millisecond events instead of coalescing them", async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);
    const sharedTimestamp = new Date(base + 100).toISOString();
    lrange
      .mockResolvedValueOnce([
        JSON.stringify({
          type: "list_updated",
          listId: "list-1",
          action: "url_updated",
          urlId: "url-1",
          timestamp: sharedTimestamp,
        }),
        JSON.stringify({
          type: "list_updated",
          listId: "list-1",
          action: "url_updated",
          urlId: "url-2",
          timestamp: sharedTimestamp,
        }),
      ])
      .mockResolvedValue([]);

    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const first = reader.read();
    const second = reader.read();
    await jest.advanceTimersByTimeAsync(1500);

    const firstChunk = new TextDecoder().decode((await first).value);
    const secondChunk = new TextDecoder().decode((await second).value);

    expect(firstChunk).toContain(
      `id: url:list-1:url-1:url_updated:${sharedTimestamp}`,
    );
    expect(secondChunk).toContain(
      `id: url:list-1:url-2:url_updated:${sharedTimestamp}`,
    );
    expect(firstChunk).not.toEqual(secondChunk);

    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("drops duplicate re-delivery of the same canonical event key", async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);
    const ts = new Date(base + 100).toISOString();
    const duplicate = JSON.stringify({
      type: "list_updated",
      listId: "list-1",
      action: "list_made_public",
      timestamp: ts,
    });
    lrange
      .mockResolvedValueOnce([duplicate, duplicate])
      .mockResolvedValue([]);

    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    await jest.advanceTimersByTimeAsync(1500);

    const eventChunk = new TextDecoder().decode((await next).value);
    expect(eventChunk).toContain(`id: list:list-1:list_made_public:${ts}`);

    const heartbeat = reader.read();
    await jest.advanceTimersByTimeAsync(20_000);
    const heartbeatChunk = new TextDecoder().decode((await heartbeat).value);
    expect(heartbeatChunk).toContain('"type":"heartbeat"');
    expect(queryRaw).toHaveBeenCalledTimes(1);

    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("registers abort cleanup with { once: true }", async () => {
    const abort = new AbortController();
    const addSpy = jest.spyOn(abort.signal, "addEventListener");
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", {
        signal: abort.signal,
      }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    expect(response.status).toBe(200);
    expect(addSpy).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
      expect.objectContaining({ once: true }),
    );
    abort.abort();
    await response.body?.cancel();
    addSpy.mockRestore();
  });

  it("cancel clears the poll interval without throwing", async () => {
    jest.useFakeTimers();
    const clearSpy = jest.spyOn(global, "clearInterval");
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", {
        signal: abort.signal,
      }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    await expect(reader.cancel()).resolves.toBeUndefined();
    expect(clearSpy).toHaveBeenCalled();
    abort.abort();
    clearSpy.mockRestore();
    jest.useRealTimers();
  });

  it("drops pre-connect history messages", async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);
    lrange
      .mockResolvedValueOnce([
        JSON.stringify({
          type: "list_updated",
          listId: "list-1",
          action: "url_updated",
          timestamp: "2020-01-01T00:00:00.000Z",
        }),
      ])
      .mockResolvedValue([]);
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    // First poll drops history; heartbeat needs HEARTBEAT_MS after connect.
    await jest.advanceTimersByTimeAsync(1500);
    await jest.advanceTimersByTimeAsync(20_000);
    const value = new TextDecoder().decode((await next).value);
    expect(value).toContain('"type":"heartbeat"');
    expect(queryRaw).not.toHaveBeenCalled();
    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  }, 15_000);
});
