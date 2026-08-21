"use client";

import { Suspense } from "react";
import {
  ApiDocsRouteSkeleton,
  BrowseRouteSkeleton,
  InsightsRouteSkeleton,
  ListDetailRouteSkeleton,
  ListsRouteSkeleton,
} from "@/components/ui/RoutePageSkeleton";
import { OptimisticSoftNavSurface } from "@/components/ui/OptimisticSoftNavSurface";
import { ApiStatusChrome } from "@/components/pages/ApiStatusChrome";
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

/** C7.3: Rare utility routes — cold skeleton only (no warm RQ surface). */
export function ApiDocsSoftNavLoading() {
  return <ApiDocsRouteSkeleton />;
}

/** C7.5: Chrome shell (not RoutePageSkeleton center spinner). */
export function ApiStatusSoftNavLoading() {
  return <ApiStatusChrome valuesPending />;
}
