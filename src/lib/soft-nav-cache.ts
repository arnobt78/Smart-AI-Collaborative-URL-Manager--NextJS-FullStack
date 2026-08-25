import type { QueryClient } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import { currentList, type UrlItem, type UrlList } from "@/stores/urlListStore";

/**
 * C6.9 / C7.9: Soft-nav warm cache — when RQ already has destination data, segment
 * loading.tsx paints OptimisticSoftNavSurface (never null / empty hole).
 * Cold soft-nav keeps one RoutePageSkeleton.
 *
 * Warm = data present (not freshness) so invalidated-but-present cache still
 * paints cached UI while refetch runs after invalidateMutationImpact.
 *
 * C7.9: Lists→detail seeds thin unified(slug) from allLists before the warm check.
 * Thin seeds are marked stale (refetchType none) so Infinity staleTime cannot blind
 * a later network fetch if SSR dehydrate is missing (playbook §8.8.5).
 *
 * C7.10.1: early-return syncs currentList; SoftNavLoading recovers warm paint
 * when Back/Forward hit a warm cache without prepareWarmSoftNav.
 */

/** Marker on thin soft-nav seeds — ListPage keeps body skeletons until hydrate/fetch clears it. */
export const SOFT_NAV_THIN_SEED = "_softNavThinSeed" as const;

type SeedableListRow = {
  id: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  urls?: unknown;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  userId?: string;
  collaborators?: string[];
  collaboratorRoles?: unknown;
};

type UnifiedCacheShape = {
  list?: SeedableListRow | { slug?: string } | null;
  activities?: unknown[];
  collaborators?: unknown[];
  commentCounts?: Record<string, number>;
  [SOFT_NAV_THIN_SEED]?: boolean;
};

export function isSoftNavThinSeed(
  data: UnifiedCacheShape | null | undefined,
): boolean {
  return Boolean(data?.[SOFT_NAV_THIN_SEED]);
}

/** Map allLists / unified list row → UrlList and sync nanostore when slug differs. */
export function syncCurrentListFromSeedRow(
  row: SeedableListRow | null | undefined,
): void {
  if (!row?.id || !row.slug) return;
  const store = currentList.get();
  if (store?.slug === row.slug) return;

  const seeded: UrlList = {
    id: row.id,
    slug: row.slug,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    isPublic: row.isPublic,
    urls: Array.isArray(row.urls) ? (row.urls as UrlItem[]) : [],
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    updatedAt: row.updatedAt
      ? String(row.updatedAt)
      : row.updated_at
        ? String(row.updated_at)
        : undefined,
    collaborators: row.collaborators,
    collaboratorRoles:
      row.collaboratorRoles &&
      typeof row.collaboratorRoles === "object" &&
      !Array.isArray(row.collaboratorRoles)
        ? (row.collaboratorRoles as Record<string, string>)
        : undefined,
  };
  currentList.set(seeded);
}

/**
 * If unified(slug) is missing but allLists has the row, seed a thin unified
 * cache so soft-nav marks warm and OptimisticSoftNavSurface can paint chrome.
 * Never reseeds when unified is explicitly `{ list: null }` (404 / deleted).
 */
export function seedUnifiedFromAllLists(
  queryClient: QueryClient,
  slug: string,
): boolean {
  const key = listQueryKeys.unified(slug);
  const existing = queryClient.getQueryData<UnifiedCacheShape>(key);

  // Full chrome-ready row already present — still sync store (cross-list flash fix)
  if (existing?.list?.slug === slug) {
    syncCurrentListFromSeedRow(existing.list as SeedableListRow);
    return true;
  }

  // Explicit null list (404 / deleted) — do not resurrect from allLists
  if (existing && existing.list == null) return false;

  const all = queryClient.getQueryData<{ lists?: SeedableListRow[] }>(
    listQueryKeys.allLists(),
  );
  const row = all?.lists?.find((list) => list.slug === slug);
  if (!row?.id || !row.slug) return false;

  queryClient.setQueryData(key, {
    list: row,
    activities: [],
    collaborators: [],
    commentCounts: {},
    [SOFT_NAV_THIN_SEED]: true,
  });

  // C7.10: seed nanostore so ListPage / soft-nav UrlList can paint urls first frame
  syncCurrentListFromSeedRow(row);

  // Keep cached paint for warm soft-nav, but mark stale so active ListPage refetches
  // when SSR dehydrate is missing (staleTime Infinity would otherwise never refetch).
  void queryClient.invalidateQueries({
    queryKey: key,
    refetchType: "none",
  });

  return true;
}

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

/**
 * C7.10.1: Paint warm optimistic UI when prepareWarmSoftNav ran, OR when
 * Back/Forward lands on a destination whose RQ cache is already warm.
 */
export function shouldPaintWarmSoftNav(
  queryClient: QueryClient,
  href: string,
): boolean {
  if (consumeWarmSoftNav()) return true;
  return isDestinationCacheWarm(queryClient, href);
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
      seedUnifiedFromAllLists(queryClient, slug);
      const data = queryClient.getQueryData<UnifiedCacheShape>(
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
