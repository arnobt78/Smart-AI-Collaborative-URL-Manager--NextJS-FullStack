import { HydrationBoundary } from "@tanstack/react-query";
import ListsPageClient from "@/components/pages/ListsPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadAllLists, serverQueryKeys } from "@/lib/server-data";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

/**
 * C6.7: Keep loading.tsx for instant soft-nav; await prefetch so hydrate seeds
 * RQ and the client does not cold-fetch / show a second DataSurfaceSlot.
 */
export default async function ListsPage() {
  await requirePageUser();
  const queryClient = createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: serverQueryKeys.allLists(),
    queryFn: loadAllLists,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListsPageClient />
    </HydrationBoundary>
  );
}
