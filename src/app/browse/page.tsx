import { HydrationBoundary } from "@tanstack/react-query";
import BrowsePage from "@/components/pages/BrowsePage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadPublicLists, serverQueryKeys } from "@/lib/server-data";
import { requirePageUser } from "@/lib/page-auth";

// Query parameters are owned by the client search form. Soft-nav uses
// loading.tsx for an instant shell; SSR hydrate avoids a second cold fetch.
export const dynamic = "force-dynamic";

/**
 * C6.7: Auth + prefetch public lists into HydrationBoundary (one skeleton via loading.tsx).
 */
export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await requirePageUser();
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = params.search?.trim() || "";
  const queryClient = createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: serverQueryKeys.publicLists(page, search || undefined),
    queryFn: () => loadPublicLists(page, search),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BrowsePage />
    </HydrationBoundary>
  );
}
