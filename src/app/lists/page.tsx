import { HydrationBoundary } from "@tanstack/react-query";
import ListsPageClient from "@/components/pages/ListsPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadAllLists, serverQueryKeys } from "@/lib/server-data";

export default async function ListsPage() {
  const queryClient = createServerQueryClient();
  try {
    await queryClient.prefetchQuery({
      queryKey: serverQueryKeys.allLists(),
      queryFn: loadAllLists,
    });
  } catch {
    // Preserve the client authentication/error flow when the server has no session.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListsPageClient />
    </HydrationBoundary>
  );
}
