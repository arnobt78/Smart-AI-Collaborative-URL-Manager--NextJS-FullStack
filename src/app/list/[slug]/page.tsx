import ListPageClient from "@/components/pages/ListPage";
import { ListDetailHydrationBoundary } from "@/components/providers/ListDetailHydrationBoundary";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadUnifiedList, serverQueryKeys } from "@/lib/server-data";
import { listQueryKeys } from "@/lib/query-keys";
import { requirePageUser } from "@/lib/page-auth";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * C6.7: Auth + unified list hydrate under loading.tsx so detail soft-nav
 * does not flash ListDetailRouteSkeleton a second time after RSC.
 * C7.26.1 verify-deep: also dehydrate session so visibility Switch canInvite
 * matches SSR (avoids disabled↔enabled HTML hydration mismatch).
 */
export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePageUser();
  const user = await getCurrentUser();
  const { slug } = await params;
  const queryClient = createServerQueryClient();
  if (user?.id && user.email) {
    queryClient.setQueryData(["session"], {
      user: { id: user.id, email: user.email },
    });
  }
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
    <ListDetailHydrationBoundary state={dehydrate(queryClient)}>
      <ListPageClient />
    </ListDetailHydrationBoundary>
  );
}
