import { HydrationBoundary } from "@tanstack/react-query";
import BusinessInsightsPage from "@/components/pages/BusinessInsightsPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import {
  loadBusinessInsightsOverview,
  serverQueryKeys,
} from "@/lib/server-data";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

/**
 * C6.8: Auth + seed overview/activity only (default tab). Other tabs fetch
 * on selection so business-insights?_rsc stays lighter.
 */
export default async function BusinessInsights() {
  await requirePageUser();
  const queryClient = createServerQueryClient();
  const data = await loadBusinessInsightsOverview();
  queryClient.setQueryData(
    serverQueryKeys.businessInsights.overview(),
    data.overview,
  );
  queryClient.setQueryData(
    serverQueryKeys.businessInsights.activity(30),
    data.activity,
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BusinessInsightsPage />
    </HydrationBoundary>
  );
}
