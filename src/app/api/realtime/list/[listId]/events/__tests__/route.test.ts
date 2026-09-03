/** @jest-environment node */
// REQ-0053: cache-ready realtime streams must not disclose list data to outsiders.
import { NextRequest } from "next/server";
import { GET } from "@/app/api/realtime/list/[listId]/events/route";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import { getListById } from "@/lib/db";
import { redis } from "@/lib/realtime/redis";

jest.mock("@/lib/list-route-access", () => ({
  resolveAuthorizedList: jest.fn(),
}));
jest.mock("@/lib/db", () => ({ getListById: jest.fn() }));
jest.mock("@/lib/realtime/redis", () => ({
  redis: { lrange: jest.fn() },
  CHANNELS: {
    listUpdate: (id: string) => `list:${id}:update`,
    listComment: (id: string) => `list:${id}:comment`,
    listActivity: (id: string) => `list:${id}:activity`,
  },
}));

const resolveAccess = resolveAuthorizedList as jest.Mock;
const getList = getListById as jest.Mock;
const lrange = (redis as unknown as { lrange: jest.Mock }).lrange;

const allowed = {
  ok: true,
  list: { id: "list-1" },
  user: { id: "user-1", email: "owner@example.test" },
  role: "owner",
};

async function readEvent(response: Response) {
  const reader = response.body!.getReader();
  await reader.read(); // connected event
  return reader;
}

beforeEach(() => {
  jest.clearAllMocks();
  resolveAccess.mockResolvedValue(allowed);
  lrange.mockResolvedValue([]);
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

  it("enriches an authorized queued mutation with the authoritative list payload", async () => {
    jest.useFakeTimers();
    lrange
      .mockResolvedValueOnce([JSON.stringify({ type: "list_updated", listId: "list-1", action: "url_updated", timestamp: "2026-09-03T00:00:00.000Z" })])
      .mockResolvedValue([]);
    getList.mockResolvedValue({ id: "list-1", slug: "warm", title: "Authoritative", urls: [] });
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    await jest.advanceTimersByTimeAsync(1000);
    const value = new TextDecoder().decode((await next).value);
    expect(value).toContain('"title":"Authoritative"');
    expect(resolveAccess).toHaveBeenCalledTimes(2);
    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("does not disclose list data when access is revoked after subscription", async () => {
    jest.useFakeTimers();
    resolveAccess.mockResolvedValueOnce(allowed).mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    lrange
      .mockResolvedValueOnce([JSON.stringify({ type: "list_updated", listId: "list-1", action: "url_updated", timestamp: "2026-09-03T00:00:00.000Z" })])
      .mockResolvedValue([]);
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    await jest.advanceTimersByTimeAsync(1000);
    const value = new TextDecoder().decode((await next).value);
    expect(value).toContain('"type":"unauthorized"');
    expect(value).not.toContain('"list":');
    expect(getList).not.toHaveBeenCalled();
    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("emits two distinct same-millisecond events instead of coalescing them", async () => {
    jest.useFakeTimers();
    const sharedTimestamp = "2026-09-03T00:00:00.000Z";
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
    getList.mockResolvedValue({ id: "list-1", slug: "warm", title: "Authoritative", urls: [] });

    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const first = reader.read();
    const second = reader.read();
    await jest.advanceTimersByTimeAsync(1000);

    const firstChunk = new TextDecoder().decode((await first).value);
    const secondChunk = new TextDecoder().decode((await second).value);

    expect(firstChunk).toContain("id: url:list-1:url-1:url_updated:2026-09-03T00:00:00.000Z");
    expect(secondChunk).toContain("id: url:list-1:url-2:url_updated:2026-09-03T00:00:00.000Z");
    expect(firstChunk).not.toEqual(secondChunk);

    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });

  it("drops duplicate re-delivery of the same canonical event key", async () => {
    jest.useFakeTimers();
    const duplicate = JSON.stringify({
      type: "list_updated",
      listId: "list-1",
      action: "list_made_public",
      timestamp: "2026-09-03T00:00:00.000Z",
    });
    lrange
      .mockResolvedValueOnce([duplicate, duplicate])
      .mockResolvedValue([]);
    getList.mockResolvedValue({ id: "list-1", slug: "warm", title: "Authoritative", urls: [] });

    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/realtime/list/list-1/events", { signal: abort.signal }),
      { params: Promise.resolve({ listId: "list-1" }) },
    );
    const reader = await readEvent(response);
    const next = reader.read();
    await jest.advanceTimersByTimeAsync(1000);

    const eventChunk = new TextDecoder().decode((await next).value);
    expect(eventChunk).toContain("id: list:list-1:list_made_public:2026-09-03T00:00:00.000Z");

    const heartbeat = reader.read();
    await jest.advanceTimersByTimeAsync(1000);
    const heartbeatChunk = new TextDecoder().decode((await heartbeat).value);
    expect(heartbeatChunk).toContain('"type":"heartbeat"');
    expect(getList).toHaveBeenCalledTimes(1);

    abort.abort();
    await reader.cancel();
    jest.useRealTimers();
  });
});
