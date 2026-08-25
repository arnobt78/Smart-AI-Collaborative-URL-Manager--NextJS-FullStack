"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiDocsRouteSkeleton,
  BrowseRouteSkeleton,
  InsightsRouteSkeleton,
  ListDetailRouteSkeleton,
  ListsRouteSkeleton,
} from "@/components/ui/RoutePageSkeleton";
import { OptimisticSoftNavSurface } from "@/components/ui/OptimisticSoftNavSurface";
import {
  ApiStatusChrome,
  ApiStatusRefreshControl,
} from "@/components/pages/ApiStatusChrome";
import { shouldPaintWarmSoftNav } from "@/lib/soft-nav-cache";

/**
 * C6.9 / C7.10.1: Segment loading gates — warm soft-nav paints OptimisticSoftNavSurface
 * from RQ (never null / empty hole); cold soft-nav shows one RoutePageSkeleton.
 * Back/Forward recovers warm paint via shouldPaintWarmSoftNav when cache is warm.
 */

export function ListsSoftNavLoading() {
  const queryClient = useQueryClient();
  if (shouldPaintWarmSoftNav(queryClient, "/lists")) {
    return <OptimisticSoftNavSurface variant="lists" />;
  }
  return <ListsRouteSkeleton />;
}

function BrowseSoftNavLoadingInner() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const page = searchParams.get("page") || "1";
  const search = searchParams.get("search") || "";
  const qs = new URLSearchParams();
  if (page !== "1") qs.set("page", page);
  if (search) qs.set("search", search);
  const href = qs.size > 0 ? `/browse?${qs.toString()}` : "/browse";

  if (shouldPaintWarmSoftNav(queryClient, href)) {
    return <OptimisticSoftNavSurface variant="browse" />;
  }
  return <BrowseRouteSkeleton />;
}

export function BrowseSoftNavLoading() {
  return (
    <Suspense fallback={<BrowseRouteSkeleton />}>
      <BrowseSoftNavLoadingInner />
    </Suspense>
  );
}

export function InsightsSoftNavLoading() {
  const queryClient = useQueryClient();
  if (shouldPaintWarmSoftNav(queryClient, "/business-insights")) {
    return <OptimisticSoftNavSurface variant="insights" />;
  }
  return <InsightsRouteSkeleton />;
}

export function ListDetailSoftNavLoading() {
  const queryClient = useQueryClient();
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
        ? slugParam[0] || ""
        : "";

  if (
    slug &&
    shouldPaintWarmSoftNav(queryClient, `/list/${encodeURIComponent(slug)}`)
  ) {
    return <OptimisticSoftNavSurface variant="list-detail" />;
  }
  return <ListDetailRouteSkeleton />;
}

/** C7.3: Rare utility routes — cold skeleton only (no warm RQ surface). */
export function ApiDocsSoftNavLoading() {
  return <ApiDocsRouteSkeleton />;
}

/** C7.5/C7.6: Chrome shell + static refreshing… header affordance. */
export function ApiStatusSoftNavLoading() {
  return (
    <ApiStatusChrome
      valuesPending
      headerAction={<ApiStatusRefreshControl isFetching staticBusy />}
    />
  );
}
