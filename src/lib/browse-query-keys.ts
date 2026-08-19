/** Shared browse/insight query keys usable by server hydration and client hooks. */
export const browseQueryKeys = {
  all: ["browse"] as const,
  publicLists: (page: number, search?: string) =>
    [...browseQueryKeys.all, "public", page, search || ""] as const,
  businessInsights: {
    all: ["business-insights"] as const,
    overview: () => [...browseQueryKeys.businessInsights.all, "overview"] as const,
    activity: (days?: number) =>
      [...browseQueryKeys.businessInsights.all, "activity", days || 30] as const,
    popular: () => [...browseQueryKeys.businessInsights.all, "popular"] as const,
    performance: () => [...browseQueryKeys.businessInsights.all, "performance"] as const,
    global: () => [...browseQueryKeys.businessInsights.all, "global"] as const,
    status: () => [...browseQueryKeys.businessInsights.all, "status"] as const,
  },
};
