import { HydrationBoundary } from "@tanstack/react-query";
import ListsPageClient from "@/components/pages/ListsPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

/**
 * C6.6: Auth-only RSC critical path. Client RQ (Infinity staleTime) fills lists;
 * segment loading.tsx paints the shell during soft-nav.
 */
export default async function ListsPage() {
  await requirePageUser();

  return (
    <HydrationBoundary state={dehydrate(createServerQueryClient())}>
      <ListsPageClient />
    </HydrationBoundary>
  );
}
