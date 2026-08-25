/**
 * React Query Cache Invalidation Utilities
 *
 * Centralized functions for invalidating React Query caches when data changes.
 * This ensures all related queries update immediately after mutations.
 *
 * C7.1 densify: list visibility/create/delete also patch browse public caches
 * immediately so warm soft-nav never paints a stale public row. Invalidate still
 * reconciles in background (Infinity staleTime).
 *
 * @module utils/queryInvalidation
 */

import { QueryClient } from "@tanstack/react-query";
import { listQueryKeys } from "@/lib/query-keys";

/** REQ-0025: One typed impact contract prevents mutation families drifting apart. */
export type MutationImpact =
  | "list"
  | "visibility"
  | "url"
  | "archive"
  | "import"
  | "collaborator"
  | "comment"
  | "collection"
  | "metadata"
  | "action"
  | "analytics";

/** Minimal list shape for densifying browse public grids. */
export type BrowseDensifyList = {
  id: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  urls?: unknown[];
  user?: { email: string };
};

type BrowsePublicCache = {
  lists: BrowseDensifyList[];
  pagination?: unknown;
};

function isBrowsePublicQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === "browse" &&
    queryKey[1] === "public"
  );
}

/**
 * C7.1: Densify all browse public list pages — upsert when public, remove when
 * private/deleted — so OptimisticSoftNavSurface never shows a ghost row.
 */
export function densifyBrowsePublicLists(
  queryClient: QueryClient,
  list: BrowseDensifyList,
  options?: { remove?: boolean },
): void {
  const shouldRemove = Boolean(options?.remove || list.isPublic === false);

  queryClient.setQueriesData<BrowsePublicCache>(
    {
      predicate: (query) => isBrowsePublicQueryKey(query.queryKey),
    },
    (current) => {
      if (!current?.lists) return current;

      if (shouldRemove) {
        const nextLists = current.lists.filter(
          (item) => item.id !== list.id && item.slug !== list.slug,
        );
        if (nextLists.length === current.lists.length) return current;
        return { ...current, lists: nextLists };
      }

      const row: BrowseDensifyList = {
        id: list.id,
        slug: list.slug,
        title: list.title ?? list.slug,
        description: list.description ?? undefined,
        isPublic: true,
        urls: list.urls ?? [],
        user: list.user ?? { email: "you@local" },
      };

      const index = current.lists.findIndex(
        (item) => item.id === list.id || item.slug === list.slug,
      );
      if (index === -1) {
        return { ...current, lists: [row, ...current.lists] };
      }

      const nextLists = current.lists.slice();
      nextLists[index] = { ...nextLists[index], ...row };
      return { ...current, lists: nextLists };
    },
  );
}

/**
 * C7.1 / C7.9: Tombstone unified cache so deleted slugs are not warm soft-nav
 * destinations and seedUnifiedFromAllLists cannot resurrect from allLists
 * (playbook §8.6). Prefer setQueryData null over removeQueries so the null
 * guard remains observable.
 */
export function dropUnifiedListCache(
  queryClient: QueryClient,
  listSlug: string,
): void {
  if (!listSlug) return;
  queryClient.setQueryData(listQueryKeys.unified(listSlug), {
    list: null,
    activities: [],
    collaborators: [],
    commentCounts: {},
  });
}

/** Snapshot browse public caches for optimistic rollback. */
export function snapshotBrowsePublicCaches(
  queryClient: QueryClient,
): Array<[readonly unknown[], BrowsePublicCache | undefined]> {
  return queryClient.getQueriesData<BrowsePublicCache>({
    predicate: (query) => isBrowsePublicQueryKey(query.queryKey),
  });
}

/** Restore browse public caches after a failed mutation. */
export function restoreBrowsePublicCaches(
  queryClient: QueryClient,
  snapshot: Array<[readonly unknown[], BrowsePublicCache | undefined]>,
): void {
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function invalidateMutationImpact(
  queryClient: QueryClient,
  impact: MutationImpact,
  listSlug: string,
  listId: string,
): void {
  switch (impact) {
    case "collaborator":
      invalidateCollaboratorQueries(queryClient, listSlug);
      return;
    case "metadata":
      invalidateUrlQueries(queryClient, listSlug, listId, true);
      return;
    case "action":
      invalidateActionQueries(queryClient, listSlug);
      return;
    case "analytics":
      invalidateAnalyticsQueries(queryClient, listSlug);
      return;
    case "list":
    case "visibility":
      invalidateListMutationQueries(queryClient, listSlug, listId);
      return;
    case "url":
    case "archive":
    case "import":
      invalidateUrlQueries(queryClient, listSlug, listId, true);
      return;
    case "collection":
      invalidateCollectionMutationQueries(queryClient, listSlug, listId);
      return;
    case "comment":
      invalidateUrlQueries(queryClient, listSlug, listId, impact !== "comment");
      return;
  }
}

/** REQ-0025: Actions change list-visible state without reloading unrelated data. */
function invalidateActionQueries(queryClient: QueryClient, listSlug: string): void {
  queryClient.invalidateQueries({ queryKey: listQueryKeys.unified(listSlug) });
  queryClient.invalidateQueries({ queryKey: listQueryKeys.allLists() });
}

/** REQ-0026: Clicks affect the list card and cached business insight KPIs. */
function invalidateAnalyticsQueries(queryClient: QueryClient, listSlug: string): void {
  invalidateActionQueries(queryClient, listSlug);
  invalidateAllBusinessInsights(queryClient);
}

/** REQ-0025: Collection creation changes suggestions and activity, not URL metadata. */
function invalidateCollectionMutationQueries(
  queryClient: QueryClient,
  listSlug: string,
  listId: string,
): void {
  invalidateActionQueries(queryClient, listSlug);
  queryClient.invalidateQueries({ queryKey: listQueryKeys.collections(listId) });
  queryClient.invalidateQueries({ queryKey: listQueryKeys.duplicates(listId) });
}

/** C7.1: Mark every insights tab stale (overview/activity/popular/performance/global). */
function invalidateAllBusinessInsights(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "business-insights",
  });
}

/**
 * Invalidate browse/public lists queries
 *
 * Use this when:
 * - List visibility changes (public/private)
 * - Public list is created/deleted
 *
 * @param queryClient - React Query client instance
 */
export function invalidateBrowseQueries(queryClient: QueryClient): void {
  // Invalidate all browse/public lists queries (any page, any search)
  queryClient.invalidateQueries({
    predicate: (query) => isBrowsePublicQueryKey(query.queryKey),
  });

  // C7.1: include activity + popular (were previously skipped → Infinity-stale tabs)
  invalidateAllBusinessInsights(queryClient);
}

/**
 * Invalidate all queries after a list change (URL added/updated/deleted, etc.)
 *
 * This ensures BOTH the unified list query and all lists query update immediately.
 * Also invalidates collections and duplicates if listId is provided.
 *
 * @param queryClient - React Query client instance
 * @param listSlug - List slug (required for unified query)
 * @param listId - List ID (optional, for collections/duplicates invalidation)
 *
 * @example
 * ```typescript
 * invalidateListQueries(queryClient, "my-list-slug", "list-id-123");
 * ```
 */
export function invalidateListQueries(
  queryClient: QueryClient,
  listSlug: string,
  listId?: string
): void {
  // Invalidate unified list query (list, activities, collaborators)
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.unified(listSlug),
  });

  // Invalidate all lists query (for lists page)
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.allLists(),
  });

  // Invalidate collections and duplicates if listId provided
  // This ensures AI suggestions refresh after URL changes
  if (listId) {
    queryClient.invalidateQueries({
      queryKey: listQueryKeys.collections(listId),
    });
    queryClient.invalidateQueries({
      queryKey: listQueryKeys.duplicates(listId),
    });
  }
}

/**
 * Invalidate all lists queries (for list-level changes)
 *
 * Use this when:
 * - List is created
 * - List is deleted
 * - List metadata changes (title, description, visibility)
 *
 * @param queryClient - React Query client instance
 *
 * @example
 * ```typescript
 * invalidateAllListsQueries(queryClient);
 * ```
 */
export function invalidateAllListsQueries(
  queryClient: QueryClient
): void {
  // CRITICAL: Invalidate all list-related queries
  // Use predicate to match all "lists" queries at once (prevents duplicate invalidations)
  // This ensures a single invalidation event instead of multiple separate ones
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        (key[0] === "lists" ||
         (key.length > 1 && key[0] === "list" && key[1] === "all"))
      );
    },
  });
}

/**
 * REQ-0021: List create/update mutations fan out once through this entrypoint.
 * Cached values stay rendered while the invalidated queries reconcile in background.
 */
export function invalidateListMutationQueries(
  queryClient: QueryClient,
  listSlug: string,
  listId?: string,
): void {
  invalidateListQueries(queryClient, listSlug, listId);
  invalidateBrowseQueries(queryClient);
}

/**
 * Invalidate list metadata queries (for URL metadata changes)
 *
 * Use this when:
 * - URLs are added/deleted (triggers batch metadata refetch)
 * - Metadata needs to be refreshed
 *
 * @param queryClient - React Query client instance
 * @param listId - List ID (optional, if not provided invalidates all metadata)
 *
 * @example
 * ```typescript
 * invalidateListMetadataQueries(queryClient, "list-id-123");
 * ```
 */
export function invalidateListMetadataQueries(
  queryClient: QueryClient,
  _: string | undefined = undefined
): void {
  // Invalidate all URL metadata queries for this list
  // This triggers batch metadata refetch if needed
  // Use exact: false to match all URL metadata queries
  queryClient.invalidateQueries({
    queryKey: ["url-metadata"],
    exact: false, // Match all URL metadata queries
  });
}

/**
 * Invalidate queries after collaborator changes
 *
 * Use this when:
 * - Collaborator is added
 * - Collaborator role is updated
 * - Collaborator is removed
 *
 * @param queryClient - React Query client instance
 * @param listSlug - List slug (required for unified query)
 *
 * @example
 * ```typescript
 * invalidateCollaboratorQueries(queryClient, "my-list-slug");
 * ```
 */
export function invalidateCollaboratorQueries(
  queryClient: QueryClient,
  listSlug: string
): void {
  // CRITICAL: Invalidate unified query (contains collaborators, permissions, activities)
  // This is the same as invalidateUrlQueries - ensures consistent behavior
  // When this is called, it triggers updates?activityLimit=30 refetch
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.unified(listSlug),
  });

  // Invalidate all lists query (for lists page - shows collaborator count)
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.allLists(),
  });

  // CRITICAL: Also invalidate collaborators query if it exists
  // This ensures collaborator lists update immediately
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === "lists" && key.includes("collaborators");
    },
  });
}

/**
 * Invalidate queries after URL changes (add/update/delete)
 *
 * Use this when:
 * - URL is added
 * - URL is updated
 * - URL is deleted
 *
 * This is a comprehensive invalidation that includes:
 * - Unified list query
 * - All lists query
 * - Collections (AI suggestions)
 * - Duplicates
 * - Metadata (optional)
 * - Business insights KPIs (C7.1)
 *
 * @param queryClient - React Query client instance
 * @param listSlug - List slug (required)
 * @param listId - List ID (required for collections/duplicates)
 * @param includeMetadata - Whether to invalidate metadata queries (default: false)
 *
 * @example
 * ```typescript
 * invalidateUrlQueries(queryClient, "my-list-slug", "list-id-123", true);
 * ```
 */
export function invalidateUrlQueries(
  queryClient: QueryClient,
  listSlug: string,
  listId: string,
  includeMetadata: boolean = false
): void {
  // Invalidate unified list query
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.unified(listSlug),
  });

  // Invalidate all lists query
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.allLists(),
  });

  // Invalidate collections (AI suggestions change when URLs change)
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.collections(listId),
  });

  // Invalidate duplicates (duplicate detection changes when URLs change)
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.duplicates(listId),
  });

  // C7.1: URL count KPIs / activity charts must not stay Infinity-stale
  invalidateAllBusinessInsights(queryClient);

  // Optionally invalidate metadata (for batch metadata refetch)
  if (includeMetadata) {
    invalidateListMetadataQueries(queryClient, listId);
  }
}
