import { HydrationBoundary } from "@tanstack/react-query";
import BusinessInsightsPage from "@/components/pages/BusinessInsightsPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

/**
 * C6.6: Auth-only RSC. Insights tabs hydrate from client RQ (no 5-way SSR wait).
 */
export default async function BusinessInsights() {
  await requirePageUser();

  return (
    <HydrationBoundary state={dehydrate(createServerQueryClient())}>
      <BusinessInsightsPage />
    </HydrationBoundary>
  );
}
