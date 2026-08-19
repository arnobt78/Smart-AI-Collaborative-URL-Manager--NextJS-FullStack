import { QueryClient, hydrate } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";

describe("REQ-0027 server query hydration", () => {
  it.each([
    [listQueryKeys.allLists(), { lists: [] }],
    [listQueryKeys.unified("hydrated-list"), { list: { slug: "hydrated-list" } }],
    [browseQueryKeys.publicLists(1), { lists: [], pagination: { page: 1 } }],
    [browseQueryKeys.businessInsights.overview(), { overview: { totalLists: 1 } }],
  ] as const)("hydrates %p without an initial client query", async (queryKey, payload) => {
    const serverClient = createServerQueryClient();
    await serverClient.prefetchQuery({ queryKey, queryFn: async () => payload });

    const browserClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    hydrate(browserClient, dehydrate(serverClient));
    const browserFetch = jest.fn(async () => ({ unexpected: true }));

    await expect(
      browserClient.ensureQueryData({ queryKey, queryFn: browserFetch }),
    ).resolves.toEqual(payload);
    expect(browserFetch).not.toHaveBeenCalled();
  });
});
