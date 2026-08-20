"use client";

import { Suspense } from "react";
import {
  BrowseRouteSkeleton,
  InsightsRouteSkeleton,
  ListDetailRouteSkeleton,
  ListsRouteSkeleton,
} from "@/components/ui/RoutePageSkeleton";
import { OptimisticSoftNavSurface } from "@/components/ui/OptimisticSoftNavSurface";
import { consumeWarmSoftNav } from "@/lib/soft-nav-cache";

/**
 * C6.9: Segment loading gates — warm soft-nav paints OptimisticSoftNavSurface
 * from RQ (never null / empty hole); cold soft-nav shows one RoutePageSkeleton.
 */

export function ListsSoftNavLoading() {
  if (consumeWarmSoftNav()) {
    return <OptimisticSoftNavSurface variant="lists" />;
  }
  return <ListsRouteSkeleton />;
}

export function BrowseSoftNavLoading() {
  if (consumeWarmSoftNav()) {
    // useSearchParams in browse optimistic surface requires Suspense
    return (
      <Suspense fallback={<BrowseRouteSkeleton />}>
        <OptimisticSoftNavSurface variant="browse" />
      </Suspense>
    );
  }
  return <BrowseRouteSkeleton />;
}

export function InsightsSoftNavLoading() {
  if (consumeWarmSoftNav()) {
    return <OptimisticSoftNavSurface variant="insights" />;
  }
  return <InsightsRouteSkeleton />;
}

export function ListDetailSoftNavLoading() {
  if (consumeWarmSoftNav()) {
    return <OptimisticSoftNavSurface variant="list-detail" />;
  }
  return <ListDetailRouteSkeleton />;
}
