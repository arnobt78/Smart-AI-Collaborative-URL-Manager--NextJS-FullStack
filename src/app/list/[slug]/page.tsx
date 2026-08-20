import { HydrationBoundary } from "@tanstack/react-query";
import ListPageClient from "@/components/pages/ListPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadUnifiedList, serverQueryKeys } from "@/lib/server-data";
import { listQueryKeys } from "@/lib/query-keys";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

/**
 * C6.7: Auth + unified list hydrate under loading.tsx so detail soft-nav
 * does not flash ListDetailRouteSkeleton a second time after RSC.
 */
export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePageUser();
  const { slug } = await params;
  const queryClient = createServerQueryClient();
  try {
    const data = await queryClient.fetchQuery({
      queryKey: serverQueryKeys.unified(slug),
      queryFn: () => loadUnifiedList(slug),
    });
    if (data.list?.id) {
      queryClient.setQueryData(listQueryKeys.collaborators(data.list.id), {
        collaborators: data.collaborators || [],
      });
    }
  } catch {
    // The client retains the current unauthorized/not-found presentation contract.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListPageClient />
    </HydrationBoundary>
  );
}
