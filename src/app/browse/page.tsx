import { HydrationBoundary } from "@tanstack/react-query";
import BrowsePage from "@/components/pages/BrowsePage";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { requirePageUser } from "@/lib/page-auth";

// Query parameters are owned by the client search form. Soft-nav uses
// loading.tsx for an instant shell; avoid remounting the browse chrome.
export const dynamic = "force-dynamic";

/**
 * C6.6: Auth-only RSC. Public lists load via client RQ after shell paint.
 */
export default async function Browse() {
  await requirePageUser();

  return (
    <HydrationBoundary state={dehydrate(createServerQueryClient())}>
      <BrowsePage />
    </HydrationBoundary>
  );
}
