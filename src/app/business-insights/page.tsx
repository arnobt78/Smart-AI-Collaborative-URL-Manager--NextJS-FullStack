import { HydrationBoundary } from "@tanstack/react-query";
import BusinessInsightsPage from "@/components/pages/BusinessInsightsPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadBusinessInsights, serverQueryKeys } from "@/lib/server-data";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function BusinessInsights() {
  await requirePageUser();
  const queryClient = createServerQueryClient();
  const data = await loadBusinessInsights();
  queryClient.setQueryData(serverQueryKeys.businessInsights.overview(), data.overview);
  queryClient.setQueryData(serverQueryKeys.businessInsights.activity(30), data.activity);
  queryClient.setQueryData(serverQueryKeys.businessInsights.popular(), data.popular);
  queryClient.setQueryData(serverQueryKeys.businessInsights.performance(), data.performance);
  queryClient.setQueryData(serverQueryKeys.businessInsights.global(), data.global);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BusinessInsightsPage />
    </HydrationBoundary>
  );
}
