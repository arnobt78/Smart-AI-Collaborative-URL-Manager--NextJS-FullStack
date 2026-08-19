import { HydrationBoundary } from "@tanstack/react-query";
import ListPageClient from "@/components/pages/ListPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadUnifiedList, serverQueryKeys } from "@/lib/server-data";

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = createServerQueryClient();
  try {
    await queryClient.prefetchQuery({
      queryKey: serverQueryKeys.unified(slug),
      queryFn: () => loadUnifiedList(slug),
    });
  } catch {
    // The client retains the current unauthorized/not-found presentation contract.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListPageClient />
    </HydrationBoundary>
  );
}
