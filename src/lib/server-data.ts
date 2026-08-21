import { NextRequest } from "next/server";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import { normalizeUnifiedListResponse, type UnifiedListResponse } from "@/lib/unified-list-response";

const INTERNAL_ORIGIN = "http://daily-urlist.internal";

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Server data loader failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/**
 * REQ-0027: These loaders invoke the existing server route contracts directly.
 * They run in the active RSC request, so cookie-session authorization remains
 * centralized in the routes and no browser-side bootstrap fetch is required.
 */
export async function loadAllLists() {
  const { GET } = await import("@/app/api/lists/route");
  return readResponse<unknown>(await GET());
}

export async function loadUnifiedList(slug: string) {
  const { GET } = await import("@/app/api/lists/[id]/updates/route");
  const request = new NextRequest(
    `${INTERNAL_ORIGIN}/api/lists/${encodeURIComponent(slug)}/updates?activityLimit=30`,
  );
  return normalizeUnifiedListResponse(await readResponse<UnifiedListResponse>(
    await GET(request, { params: Promise.resolve({ id: slug }) }),
  ));
}

export async function loadPublicLists(page: number, search: string) {
  const { GET } = await import("@/app/api/lists/public/route");
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  return readResponse<unknown>(
    await GET(new NextRequest(`${INTERNAL_ORIGIN}/api/lists/public?${params}`)),
  );
}

export async function loadBusinessInsights() {
  const [overviewRoute, activityRoute, popularRoute, performanceRoute, globalRoute] = await Promise.all([
    import("@/app/api/business-insights/overview/route"),
    import("@/app/api/business-insights/activity/route"),
    import("@/app/api/business-insights/popular/route"),
    import("@/app/api/business-insights/performance/route"),
    import("@/app/api/business-insights/global/route"),
  ]);

  const [overview, activity, popular, performance, global] = await Promise.all([
    readResponse<unknown>(await overviewRoute.GET(new NextRequest(`${INTERNAL_ORIGIN}/api/business-insights/overview`))),
    readResponse<unknown>(await activityRoute.GET(new NextRequest(`${INTERNAL_ORIGIN}/api/business-insights/activity?days=30`))),
    readResponse<unknown>(await popularRoute.GET(new NextRequest(`${INTERNAL_ORIGIN}/api/business-insights/popular`))),
    readResponse<unknown>(await performanceRoute.GET(new NextRequest(`${INTERNAL_ORIGIN}/api/business-insights/performance`))),
    readResponse<unknown>(await globalRoute.GET(new NextRequest(`${INTERNAL_ORIGIN}/api/business-insights/global`))),
  ]);

  return { overview, activity, popular, performance, global };
}

/** C6.8 / C7.2: Lighter Insights RSC — overview + activity only; one shared list scan. */
export async function loadBusinessInsightsOverview() {
  const [overviewRoute, activityRoute] = await Promise.all([
    import("@/app/api/business-insights/overview/route"),
    import("@/app/api/business-insights/activity/route"),
  ]);

  const [overview, activity] = await Promise.all([
    readResponse<unknown>(
      await overviewRoute.GET(
        new NextRequest(`${INTERNAL_ORIGIN}/api/business-insights/overview`),
      ),
    ),
    readResponse<unknown>(
      await activityRoute.GET(
        new NextRequest(
          `${INTERNAL_ORIGIN}/api/business-insights/activity?days=30`,
        ),
      ),
    ),
  ]);

  return { overview, activity };
}

export async function loadApiStatus(origin: string) {
  const { GET } = await import("@/app/api/business-insights/status/route");
  return readResponse<unknown>(
    await GET(new NextRequest(`${origin}/api/business-insights/status`)),
  );
}

export const serverQueryKeys = {
  allLists: listQueryKeys.allLists,
  unified: listQueryKeys.unified,
  publicLists: browseQueryKeys.publicLists,
  businessInsights: browseQueryKeys.businessInsights,
};
