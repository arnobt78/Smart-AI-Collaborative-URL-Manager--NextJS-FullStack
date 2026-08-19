import ApiStatusPage from "@/components/pages/ApiStatusPage";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePageUser } from "@/lib/page-auth";
import { createServerQueryClient, dehydrate } from "@/lib/server-query";
import { loadApiStatus, serverQueryKeys } from "@/lib/server-data";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ApiStatus() {
  await requirePageUser();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const queryClient = createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: serverQueryKeys.businessInsights.status(),
    queryFn: () => loadApiStatus(origin),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApiStatusPage />
    </HydrationBoundary>
  );
}
