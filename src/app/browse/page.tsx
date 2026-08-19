import { HydrationBoundary } from "@tanstack/react-query";
import BrowsePage from "@/components/pages/BrowsePage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadPublicLists, serverQueryKeys } from "@/lib/server-data";

// Query parameters are owned by the client search form. Dynamic rendering avoids
// a route-level Suspense fallback that used to remount the entire browse shell.
export const dynamic = "force-dynamic";

export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
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
