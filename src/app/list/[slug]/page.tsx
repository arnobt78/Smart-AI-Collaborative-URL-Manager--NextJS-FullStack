import { HydrationBoundary } from "@tanstack/react-query";
import ListPageClient from "@/components/pages/ListPage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

/**
 * C6.6: Auth-only RSC. Unified list loads via client RQ; slug-safe placeholder
 * rules stay in ListPageClient.
 */
export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePageUser();
  // Params are resolved so the segment is ready; data fetch is client-owned.
  await params;

  return (
    <HydrationBoundary state={dehydrate(createServerQueryClient())}>
      <ListPageClient />
    </HydrationBoundary>
  );
}
