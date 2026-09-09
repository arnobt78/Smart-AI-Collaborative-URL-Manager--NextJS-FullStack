"use client";

import {
  HydrationBoundary,
  useQueryClient,
  type DehydratedState,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { evictThinUnifiedBlockingDehydrate } from "@/lib/soft-nav-cache";

/**
 * C7.26.1: Evict blocking unified/session cache before HydrationBoundary so RSC
 * dehydrate hydrates in-render (urlCount + Switch canInvite — RISK-0035).
 */
export function ListDetailHydrationBoundary({
  state,
  children,
}: {
  state: DehydratedState | null | undefined;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  // Parent render runs before HydrationBoundary's in-render hydrate useMemo.
  evictThinUnifiedBlockingDehydrate(queryClient, state);
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
