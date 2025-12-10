/**
 * React Query Cache Invalidation Utilities
 *
 * Centralized functions for invalidating React Query caches when data changes.
 * This ensures all related queries update immediately after mutations.
 *
 * Following the pattern from REACT_QUERY_SETUP_GUIDE.md:
 * - Cache forever until invalidated (staleTime: Infinity)
 * - Centralized invalidation ensures all related queries update together
 * - Single source of truth for cache invalidation logic
 *
 * @module utils/queryInvalidation
 */

import { QueryClient } from "@tanstack/react-query";
import { listQueryKeys } from "@/hooks/useListQueries";

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
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key[0] === "browse" &&
        key[1] === "public"
      );
    },
  });

  // Also invalidate business insights that show public list counts
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key[0] === "business-insights" &&
        (key[1] === "overview" || key[1] === "performance" || key[1] === "global")
      );
    },
  });
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
  listId?: string
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
  // Invalidate unified query (contains collaborators)
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.unified(listSlug),
  });

  // Invalidate all lists query (for lists page - shows collaborator count)
  queryClient.invalidateQueries({
    queryKey: listQueryKeys.allLists(),
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

  // Optionally invalidate metadata (for batch metadata refetch)
  if (includeMetadata) {
    invalidateListMetadataQueries(queryClient, listId);
  }
}

