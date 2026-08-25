import { QueryClient } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import {
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
