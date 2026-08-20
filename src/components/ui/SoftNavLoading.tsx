"use client";

import {
  BrowseRouteSkeleton,
  InsightsRouteSkeleton,
  ListDetailRouteSkeleton,
  ListsRouteSkeleton,
} from "@/components/ui/RoutePageSkeleton";
import { consumeWarmSoftNav } from "@/lib/soft-nav-cache";

/**
 * C6.8: Segment loading gates — warm soft-nav returns null (keep prior UI);
 * cold soft-nav shows the matching RoutePageSkeleton preset.
 */

export function ListsSoftNavLoading() {
  if (consumeWarmSoftNav()) return null;
  return <ListsRouteSkeleton />;
}

export function BrowseSoftNavLoading() {
  if (consumeWarmSoftNav()) return null;
  return <BrowseRouteSkeleton />;
}

export function InsightsSoftNavLoading() {
  if (consumeWarmSoftNav()) return null;
  return <InsightsRouteSkeleton />;
}

export function ListDetailSoftNavLoading() {
  if (consumeWarmSoftNav()) return null;
  return <ListDetailRouteSkeleton />;
}
