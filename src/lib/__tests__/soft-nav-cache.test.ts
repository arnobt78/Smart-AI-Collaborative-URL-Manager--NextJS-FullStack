import { QueryClient } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import {
  clearWarmSoftNav,
  consumeWarmSoftNav,
  isDestinationCacheWarm,
  markWarmSoftNav,
  peekWarmSoftNav,
  prepareWarmSoftNav,
  resetWarmSoftNavForTests,
} from "@/lib/soft-nav-cache";

describe("C6.9 soft-nav-cache", () => {
  beforeEach(() => {
    resetWarmSoftNavForTests();
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
});
