import { HydrationBoundary } from "@tanstack/react-query";
import BusinessInsightsPage from "@/components/pages/BusinessInsightsPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadBusinessInsights, serverQueryKeys } from "@/lib/server-data";

export default async function BusinessInsights() {
  const queryClient = createServerQueryClient();
  try {
    const data = await loadBusinessInsights();
    queryClient.setQueryData(serverQueryKeys.businessInsights.overview(), data.overview);
    queryClient.setQueryData(serverQueryKeys.businessInsights.activity(30), data.activity);
    queryClient.setQueryData(serverQueryKeys.businessInsights.popular(), data.popular);
    queryClient.setQueryData(serverQueryKeys.businessInsights.performance(), data.performance);
    queryClient.setQueryData(serverQueryKeys.businessInsights.global(), data.global);
  } catch {
    // Preserve the current client-side unauthorized/error behavior.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BusinessInsightsPage />
    </HydrationBoundary>
  );
}
