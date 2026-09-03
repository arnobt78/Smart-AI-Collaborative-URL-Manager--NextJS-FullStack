import { QueryClient } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import {
  densifyAllLists,
  densifyBrowsePublicLists,
  dropUnifiedListCache,
  invalidateBrowseQueries,
  invalidateMutationImpact,
} from "@/utils/queryInvalidation";

describe("REQ-0025 mutation impact gateway", () => {
  it.each([
    "list",
    "visibility",
    "url",
    "archive",
    "import",
    "collaborator",
    "comment",
    "collection",
    "metadata",
    "action",
    "analytics",
  ] as const)("maps %s through one centralized invalidation path", (impact) => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");

    invalidateMutationImpact(client, impact, "test-list", "list-1");

    expect(invalidate).toHaveBeenCalled();
  });
});

describe("C7.1 densify browse + insights invalidation", () => {
  it("densifyBrowsePublicLists upserts public rows and removes private/deleted", () => {
    const client = new QueryClient();
    const key = browseQueryKeys.publicLists(1, "");
    client.setQueryData(key, {
      lists: [{ id: "a", slug: "a", title: "A", isPublic: true, urls: [] }],
    });

    densifyBrowsePublicLists(client, {
      id: "b",
      slug: "b",
      title: "B",
      isPublic: true,
      urls: [],
    });
    expect(client.getQueryData<{ lists: { id: string }[] }>(key)?.lists.map((l) => l.id)).toEqual([
      "b",
      "a",
    ]);

    densifyBrowsePublicLists(client, { id: "b", slug: "b", isPublic: false });
    expect(client.getQueryData<{ lists: { id: string }[] }>(key)?.lists.map((l) => l.id)).toEqual([
      "a",
    ]);

    densifyBrowsePublicLists(client, { id: "a", slug: "a" }, { remove: true });
    expect(client.getQueryData<{ lists: { id: string }[] }>(key)?.lists).toEqual([]);
  });

  it("densifyBrowsePublicLists preserves existing user when patch omits user", () => {
    const client = new QueryClient();
    const key = browseQueryKeys.publicLists(1, "");
    client.setQueryData(key, {
      lists: [
        {
          id: "a",
          slug: "a",
          title: "A",
          isPublic: true,
          urls: [],
          user: { email: "owner@example.com" },
        },
      ],
    });

    densifyBrowsePublicLists(client, {
      id: "a",
      slug: "a",
      title: "A2",
      isPublic: true,
      urls: [],
    });

    expect(
      client.getQueryData<{ lists: { user?: { email: string }; title?: string }[] }>(
        key,
      )?.lists[0],
    ).toMatchObject({
      title: "A2",
      user: { email: "owner@example.com" },
    });
  });

  it("densifyBrowsePublicLists does not invent you@local on insert without user", () => {
    const client = new QueryClient();
    const key = browseQueryKeys.publicLists(1, "");
    client.setQueryData(key, { lists: [] });

    densifyBrowsePublicLists(client, {
      id: "b",
      slug: "b",
      title: "B",
      isPublic: true,
      urls: [],
    });

    const row = client.getQueryData<{ lists: { user?: { email: string } }[] }>(
      key,
    )?.lists[0];
    expect(row?.user).toBeUndefined();
  });

  it("visibility impact invalidates browse/insights but not unified", () => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    invalidateMutationImpact(client, "visibility", "test-list", "list-1");
    const keys = invalidate.mock.calls.map((call) => call[0]);
    const asPredicate = keys.some(
      (opts) =>
        opts &&
        typeof opts === "object" &&
        "predicate" in opts &&
        typeof (opts as { predicate?: unknown }).predicate === "function",
    );
    expect(asPredicate || invalidate.mock.calls.length > 0).toBe(true);
    // Must not target unified list key directly
    expect(
      keys.some(
        (opts) =>
          opts &&
          typeof opts === "object" &&
          "queryKey" in opts &&
          JSON.stringify((opts as { queryKey?: unknown }).queryKey) ===
            JSON.stringify(listQueryKeys.unified("test-list")),
      ),
    ).toBe(false);
  });

  it("densifyAllLists inserts, upserts by temporaryId, and removes", () => {
    const client = new QueryClient();
    const key = listQueryKeys.allLists();
    client.setQueryData(key, {
      lists: [
        {
          id: "src",
          slug: "src",
          title: "Source",
          urls: [{ id: "u1", url: "https://a.com" }],
          collaborators: [],
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    densifyAllLists(client, {
      id: "temp-c",
      slug: "temp-c",
      title: "New Collection",
      urls: [{ id: "u1", url: "https://a.com" }],
      isPublic: false,
      collaborators: [],
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
    expect(
      client.getQueryData<{ lists: { id: string }[] }>(key)?.lists.map((l) => l.id),
    ).toEqual(["temp-c", "src"]);

    densifyAllLists(
      client,
      {
        id: "real-c",
        slug: "real-c",
        title: "New Collection",
        urls: [{ id: "u1", url: "https://a.com" }],
        isPublic: false,
        collaborators: [],
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
      { temporaryId: "temp-c" },
    );
    expect(
      client
        .getQueryData<{ lists: { id: string; slug: string }[] }>(key)
        ?.lists.map((l) => `${l.id}:${l.slug}`),
    ).toEqual(["real-c:real-c", "src:src"]);

    densifyAllLists(client, {
      id: "src",
      slug: "src",
      urls: [],
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
    expect(
      client
        .getQueryData<{ lists: { id: string; urls?: unknown[] }[] }>(key)
        ?.lists.find((l) => l.id === "src")?.urls,
    ).toEqual([]);

    densifyAllLists(client, { id: "real-c", slug: "real-c" }, { remove: true });
    expect(
      client.getQueryData<{ lists: { id: string }[] }>(key)?.lists.map((l) => l.id),
    ).toEqual(["src"]);
  });

  it("dropUnifiedListCache tombs unified so soft-nav cannot reseed a ghost", () => {
    const client = new QueryClient();
    client.setQueryData(listQueryKeys.unified("gone"), { list: { slug: "gone" } });
    dropUnifiedListCache(client, "gone");
    expect(
      client.getQueryData<{ list: null }>(listQueryKeys.unified("gone"))?.list,
    ).toBeNull();
  });

  it("invalidateBrowseQueries marks activity and popular stale", () => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    invalidateBrowseQueries(client);

    const predicates = invalidate.mock.calls
      .map((call) => call[0]?.predicate)
      .filter(Boolean) as Array<(q: { queryKey: unknown }) => boolean>;

    expect(
      predicates.some((pred) =>
        pred({ queryKey: browseQueryKeys.businessInsights.activity(30) }),
      ),
    ).toBe(true);
    expect(
      predicates.some((pred) =>
        pred({ queryKey: browseQueryKeys.businessInsights.popular() }),
      ),
    ).toBe(true);
  });

  it("url impact invalidates business-insights", () => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    invalidateMutationImpact(client, "url", "test-list", "list-1");

    const predicates = invalidate.mock.calls
      .map((call) => call[0]?.predicate)
      .filter(Boolean) as Array<(q: { queryKey: unknown }) => boolean>;

    expect(
      predicates.some((pred) =>
        pred({ queryKey: browseQueryKeys.businessInsights.overview() }),
      ),
    ).toBe(true);
  });
});
