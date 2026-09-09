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
  resolveListDetailPaintList,
  seedUnifiedFromAllLists,
  shouldPaintWarmSoftNav,
  syncUnifiedSubCachesFromUnified,
  evictThinUnifiedBlockingDehydrate,
  urlsBadgeSignature,
  SOFT_NAV_THIN_SEED,
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
          urlCount: 5,
        },
      ],
    });
    expect(isDestinationCacheWarm(client, "/list/my-list")).toBe(true);
    const seeded = client.getQueryData<{
      list?: { title?: string; urlCount?: number; urls?: unknown[] };
      _softNavThinSeed?: boolean;
    }>(listQueryKeys.unified("my-list"));
    expect(seeded?.list?.title).toBe("My List");
    expect(seeded?.list?.urlCount).toBe(5);
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

  it("resolveListDetailPaintList prefers RQ urls over disagreeing store until hydrated", () => {
    const rq = {
      id: "1",
      slug: "my-list",
      urls: [{ id: "u1" }, { id: "u2" }],
    };
    const store = {
      id: "1",
      slug: "my-list",
      urls: [],
    };
    const thin = {
      list: rq,
      [SOFT_NAV_THIN_SEED]: true,
    };
    const painted = resolveListDetailPaintList({
      slug: "my-list",
      rqList: rq,
      storeList: store,
      unifiedPayload: thin,
    });
    expect(painted?.urls).toHaveLength(2);

    const hydrated = resolveListDetailPaintList({
      slug: "my-list",
      rqList: rq,
      storeList: store,
      unifiedPayload: { list: rq },
    });
    expect(hydrated).toBe(rq);
  });

  it("evictThinUnifiedBlockingDehydrate removes blocking unified cache only", () => {
    const client = new QueryClient();
    const key = listQueryKeys.unified("my-list");
    const thin = {
      list: { id: "1", slug: "my-list", urls: [] },
      [SOFT_NAV_THIN_SEED]: true,
    };
    const full = {
      list: { id: "1", slug: "my-list", urls: [{ id: "u1" }, { id: "u2" }] },
      activities: [],
      collaborators: [],
    };
    const makeState = (dataUpdatedAt: number) => ({
      mutations: [],
      queries: [
        {
          queryHash: JSON.stringify(key),
          queryKey: key,
          state: {
            data: full,
            dataUpdateCount: 1,
            dataUpdatedAt,
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            isInvalidated: false,
            status: "success" as const,
            fetchStatus: "idle" as const,
          },
        },
      ],
    });

    client.setQueryData(key, thin);
    evictThinUnifiedBlockingDehydrate(client, makeState(Date.now()));
    expect(client.getQueryData(key)).toBeUndefined();

    // Same-or-newer hydrated entry must survive re-render (do not re-evict)
    const hydratedAt = Date.now();
    client.setQueryData(key, full);
    const entry = client.getQueryCache().find({ queryKey: key, exact: true });
    entry?.setState({ dataUpdatedAt: hydratedAt });
    evictThinUnifiedBlockingDehydrate(client, makeState(hydratedAt));
    expect(client.getQueryData(key)).toEqual(full);

    // Older cache yields to newer dehydrate
    entry?.setState({ dataUpdatedAt: hydratedAt - 1000 });
    evictThinUnifiedBlockingDehydrate(client, makeState(hydratedAt));
    expect(client.getQueryData(key)).toBeUndefined();
  });

  it("evictThinUnifiedBlockingDehydrate also clears stale session for dehydrate", () => {
    const client = new QueryClient();
    const key = ["session"] as const;
    client.setQueryData(key, { user: { id: "old", email: "old@test.com" } });
    const entry = client.getQueryCache().find({ queryKey: [...key], exact: true });
    const hydratedAt = Date.now();
    entry?.setState({ dataUpdatedAt: hydratedAt - 5000 });
    evictThinUnifiedBlockingDehydrate(client, {
      mutations: [],
      queries: [
        {
          queryHash: JSON.stringify(key),
          queryKey: [...key],
          state: {
            data: { user: { id: "new", email: "new@test.com" } },
            dataUpdateCount: 1,
            dataUpdatedAt: hydratedAt,
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            isInvalidated: false,
            status: "success" as const,
            fetchStatus: "idle" as const,
          },
        },
      ],
    });
    expect(client.getQueryData(key)).toBeUndefined();
  });

  it("urlsBadgeSignature changes when commentCount differs at same length", () => {
    const a = [{ id: "u1", commentCount: 0, clickCount: 0 }];
    const b = [{ id: "u1", commentCount: 1, clickCount: 0 }];
    expect(urlsBadgeSignature(a)).not.toBe(urlsBadgeSignature(b));
    expect(urlsBadgeSignature(a)).toBe("u1:0:0");
    expect(urlsBadgeSignature(b)).toBe("u1:1:0");
  });

  it("resolveListDetailPaintList prefers RQ when commentCount disagrees at same length", () => {
    const rq = {
      id: "1",
      slug: "my-list",
      urls: [{ id: "u1", commentCount: 1 }],
    };
    const store = {
      id: "1",
      slug: "my-list",
      urls: [{ id: "u1" }],
    };
    const painted = resolveListDetailPaintList({
      slug: "my-list",
      rqList: rq,
      storeList: store,
      unifiedPayload: { list: rq, [SOFT_NAV_THIN_SEED]: true },
    });
    expect(painted?.urls).toEqual(rq.urls);
  });
});
