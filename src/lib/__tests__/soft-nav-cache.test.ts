import { QueryClient } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import {
  clearWarmSoftNav,
  consumeWarmSoftNav,
  isDestinationCacheWarm,
  isUnifiedListHydrated,
  markWarmSoftNav,
  peekWarmSoftNav,
  prepareWarmSoftNav,
  resetWarmSoftNavForTests,
  seedUnifiedFromAllLists,
  shouldPaintWarmSoftNav,
  syncUnifiedSubCachesFromUnified,
} from "@/lib/soft-nav-cache";
import { currentList } from "@/stores/urlListStore";

describe("C6.9 soft-nav-cache", () => {
  beforeEach(() => {
    resetWarmSoftNavForTests();
    currentList.set({});
  });

  it("marks and consumes warm soft-nav once", () => {
    markWarmSoftNav();
    expect(peekWarmSoftNav()).toBe(true);
    expect(consumeWarmSoftNav()).toBe(true);
    expect(peekWarmSoftNav()).toBe(false);
    expect(consumeWarmSoftNav()).toBe(false);
  });

  it("detects warm lists / browse / insights / detail caches", () => {
    const client = new QueryClient();
    expect(isDestinationCacheWarm(client, "/lists")).toBe(false);

    client.setQueryData(listQueryKeys.allLists(), { lists: [] });
    expect(isDestinationCacheWarm(client, "/lists")).toBe(true);

    client.setQueryData(browseQueryKeys.publicLists(1, ""), { lists: [] });
    expect(isDestinationCacheWarm(client, "/browse")).toBe(true);
    // C6.9: search/page warm only when that exact key exists.
    expect(isDestinationCacheWarm(client, "/browse?search=x")).toBe(false);
    client.setQueryData(browseQueryKeys.publicLists(1, "x"), { lists: [] });
    expect(isDestinationCacheWarm(client, "/browse?search=x")).toBe(true);
    client.setQueryData(browseQueryKeys.publicLists(2, ""), { lists: [] });
    expect(isDestinationCacheWarm(client, "/browse?page=2")).toBe(true);

    client.setQueryData(browseQueryKeys.businessInsights.overview(), { overview: {} });
    client.setQueryData(browseQueryKeys.businessInsights.activity(30), { activity: [] });
    expect(isDestinationCacheWarm(client, "/business-insights")).toBe(true);

    client.setQueryData(listQueryKeys.unified("test"), { list: { slug: "test" } });
    expect(isDestinationCacheWarm(client, "/list/test")).toBe(true);
    expect(isDestinationCacheWarm(client, "/list/other")).toBe(false);
  });

  it("prepareWarmSoftNav sets flag only when warm", () => {
    const client = new QueryClient();
    expect(prepareWarmSoftNav(client, "/lists")).toBe(false);
    expect(consumeWarmSoftNav()).toBe(false);

    client.setQueryData(listQueryKeys.allLists(), { lists: [] });
    expect(prepareWarmSoftNav(client, "/lists")).toBe(true);
    expect(consumeWarmSoftNav()).toBe(true);
    clearWarmSoftNav();
  });

  it("seeds unified from allLists so list detail is warm", () => {
    const client = new QueryClient();
    client.setQueryData(listQueryKeys.allLists(), {
      lists: [
        {
          id: "1",
          slug: "my-list",
          title: "My List",
          description: "desc",
          isPublic: false,
          urls: [],
        },
      ],
    });
    expect(isDestinationCacheWarm(client, "/list/my-list")).toBe(true);
    const seeded = client.getQueryData<{
      list?: { title?: string };
      _softNavThinSeed?: boolean;
    }>(listQueryKeys.unified("my-list"));
    expect(seeded?.list?.title).toBe("My List");
    expect(seeded?._softNavThinSeed).toBe(true);
    expect(currentList.get().slug).toBe("my-list");
    expect(currentList.get().title).toBe("My List");
    expect(client.getQueryState(listQueryKeys.unified("my-list"))?.isInvalidated).toBe(
      true,
    );
    expect(prepareWarmSoftNav(client, "/list/my-list")).toBe(true);
    expect(consumeWarmSoftNav()).toBe(true);
  });

  it("does not reseed from allLists when unified list is null", () => {
    const client = new QueryClient();
    client.setQueryData(listQueryKeys.allLists(), {
      lists: [{ id: "1", slug: "gone", title: "Gone", urls: [] }],
    });
    client.setQueryData(listQueryKeys.unified("gone"), {
      list: null,
      activities: [],
      collaborators: [],
    });
    expect(seedUnifiedFromAllLists(client, "gone")).toBe(false);
    expect(isDestinationCacheWarm(client, "/list/gone")).toBe(false);
    expect(
      client.getQueryData<{ list: null }>(listQueryKeys.unified("gone"))?.list,
    ).toBeNull();
  });

  it("early-return syncs currentList when unified already present", () => {
    const client = new QueryClient();
    currentList.set({
      id: "other",
      slug: "other-list",
      title: "Other",
      urls: [],
      createdAt: "",
    });
    client.setQueryData(listQueryKeys.unified("my-list"), {
      list: {
        id: "1",
        slug: "my-list",
        title: "My List",
        urls: [{ id: "u1", url: "https://a.com", createdAt: "", isFavorite: false }],
      },
    });
    expect(seedUnifiedFromAllLists(client, "my-list")).toBe(true);
    expect(currentList.get().slug).toBe("my-list");
    expect(currentList.get().title).toBe("My List");
    expect(currentList.get().urls).toHaveLength(1);
  });

  it("shouldPaintWarmSoftNav recovers when cache warm without prepare", () => {
    const client = new QueryClient();
    client.setQueryData(listQueryKeys.allLists(), { lists: [] });
    expect(peekWarmSoftNav()).toBe(false);
    expect(shouldPaintWarmSoftNav(client, "/lists")).toBe(true);
    expect(peekWarmSoftNav()).toBe(false);
  });

  it("isUnifiedListHydrated is false for thin seed and true after full fetch shape", () => {
    const thin = {
      list: { id: "1", slug: "my-list" },
      _softNavThinSeed: true,
    };
    expect(isUnifiedListHydrated(thin, "my-list")).toBe(false);

    const hydrated = {
      list: { id: "1", slug: "my-list" },
      collaborators: [],
      activities: [],
    };
    expect(isUnifiedListHydrated(hydrated, "my-list")).toBe(true);
    expect(isUnifiedListHydrated(hydrated, "other")).toBe(false);
  });

  it("syncUnifiedSubCachesFromUnified seeds collaborators key", () => {
    const client = new QueryClient();
    syncUnifiedSubCachesFromUnified(client, {
      list: { id: "list-1", slug: "slug" },
      collaborators: [{ email: "a@test.com", role: "viewer" }],
    });
    expect(
      client.getQueryData<{ collaborators: unknown[] }>(
        listQueryKeys.collaborators("list-1"),
      )?.collaborators,
    ).toHaveLength(1);
  });
});
