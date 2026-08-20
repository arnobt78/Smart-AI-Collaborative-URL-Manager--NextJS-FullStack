import type { QueryClient } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";

/**
 * C6.9: Soft-nav warm cache — when RQ already has destination data, segment
 * loading.tsx paints OptimisticSoftNavSurface (never null / empty hole).
 * Cold soft-nav keeps one RoutePageSkeleton.
 *
 * Warm = data present (not freshness) so invalidated-but-present cache still
 * paints cached UI while refetch runs after invalidateMutationImpact.
 */

let warmSoftNavPending = false;
let warmSoftNavClearTimer: ReturnType<typeof setTimeout> | null = null;

/** Mark the next soft-nav as warm so segment loading.tsx paints optimistic UI. */
export function markWarmSoftNav(): void {
  warmSoftNavPending = true;
  if (warmSoftNavClearTimer) clearTimeout(warmSoftNavClearTimer);
  // Safety: never leave the flag sticky if loading UI never mounts.
  warmSoftNavClearTimer = setTimeout(() => {
    warmSoftNavPending = false;
    warmSoftNavClearTimer = null;
  }, 8000);
}

/** Clear warm mark without consuming (cold navigation). */
export function clearWarmSoftNav(): void {
  warmSoftNavPending = false;
  if (warmSoftNavClearTimer) {
    clearTimeout(warmSoftNavClearTimer);
    warmSoftNavClearTimer = null;
  }
}

/** Read warm flag without consuming (tests / helpers). */
export function peekWarmSoftNav(): boolean {
  return warmSoftNavPending;
}

/** Consume-once for loading.tsx client gates. */
export function consumeWarmSoftNav(): boolean {
  if (!warmSoftNavPending) return false;
  warmSoftNavPending = false;
  if (warmSoftNavClearTimer) {
    clearTimeout(warmSoftNavClearTimer);
    warmSoftNavClearTimer = null;
  }
  return true;
}

/** Test helper — reset module flag between tests. */
export function resetWarmSoftNavForTests(): void {
  clearWarmSoftNav();
}

function hasQueryData(queryClient: QueryClient, queryKey: readonly unknown[]): boolean {
  return queryClient.getQueryData(queryKey) != null;
}

/**
 * Parse an app href and report whether the singleton RQ client already holds
 * enough data to paint the destination without a RoutePageSkeleton flash.
 */
export function isDestinationCacheWarm(
  queryClient: QueryClient,
  href: string,
): boolean {
  try {
    const url = new URL(href, "http://daily-urlist.local");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/lists") {
      return hasQueryData(queryClient, listQueryKeys.allLists());
    }

    if (path === "/browse") {
      // C6.9: warm when the exact page/search key is present (default 1, "").
      const pageRaw = url.searchParams.get("page");
      const page = pageRaw ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;
      const search = url.searchParams.get("search") || "";
      return hasQueryData(queryClient, browseQueryKeys.publicLists(page, search));
    }

    if (path === "/business-insights") {
      return (
        hasQueryData(queryClient, browseQueryKeys.businessInsights.overview()) &&
        hasQueryData(queryClient, browseQueryKeys.businessInsights.activity(30))
      );
    }

    const listMatch = path.match(/^\/list\/([^/]+)$/);
    if (listMatch) {
      const slug = decodeURIComponent(listMatch[1]);
      const data = queryClient.getQueryData<{ list?: { slug?: string } }>(
        listQueryKeys.unified(slug),
      );
      return Boolean(data?.list?.slug === slug);
    }

    return false;
  } catch {
    return false;
  }
}

/** Prepare warm/cold flag immediately before a soft-nav. */
export function prepareWarmSoftNav(
  queryClient: QueryClient,
  href: string,
): boolean {
  const warm = isDestinationCacheWarm(queryClient, href);
  if (warm) markWarmSoftNav();
  else clearWarmSoftNav();
  return warm;
}
