import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchUrlMetadata, type UrlMetadata } from "@/utils/urlMetadata";
import {
  loadQueryDataFromLocalStorage,
  saveQueryDataToLocalStorage,
} from "@/lib/react-query";

export function useUrlMetadata(url: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  // Memoize queryKey to prevent infinite loops
  const queryKey = useMemo(() => ["url-metadata", url] as const, [url]);

  // Load from both React Query cache and localStorage for initial data
  const initialData = useMemo(() => {
    if (enabled && url) {
      // First check React Query cache (fastest)
      const cachedInQuery = queryClient.getQueryData<UrlMetadata>(queryKey);
      if (cachedInQuery) {
        return cachedInQuery;
      }
      
      // Fallback to localStorage cache
      const cachedInStorage = loadQueryDataFromLocalStorage(queryKey);
      if (cachedInStorage) {
        // Hydrate React Query cache with localStorage data
        queryClient.setQueryData(queryKey, cachedInStorage);
        return cachedInStorage;
      }
      
      return undefined;
    }
    return undefined;
    // Only depend on enabled and url since queryKey is derived from url
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url, queryClient, queryKey]);

  // Check if we have cached data in React Query (may have been prefetched)
  const cachedData = queryClient.getQueryData<UrlMetadata>(queryKey);
  const hasCachedData = !!cachedData || !!initialData;

  // Log cache status when hook is enabled (development only)
  if (process.env.NODE_ENV === "development" && enabled && url) {
    if (cachedData) {
      console.log(`✅ [HOOK ${url.slice(0, 30)}...] React Query cache HIT - using cached data`);
    } else if (initialData) {
      console.log(`✅ [HOOK ${url.slice(0, 30)}...] localStorage cache HIT - hydrated to React Query`);
    } else if (!enabled) {
      console.log(`⏸️ [HOOK ${url.slice(0, 30)}...] Hook DISABLED - batch fetch not ready yet`);
    } else {
      console.log(`🔄 [HOOK ${url.slice(0, 30)}...] Cache MISS - will fetch from API (enabled: ${enabled})`);
    }
  }

  const query = useQuery<UrlMetadata>({
    queryKey,
    queryFn: async () => {
      // Log when actually fetching (development only, only if enabled and no cache)
      const startTime = process.env.NODE_ENV === "development" ? performance.now() : 0;
      if (process.env.NODE_ENV === "development" && enabled && !hasCachedData) {
        console.log(`🌐 [HOOK FETCH ${url.slice(0, 30)}...] Fetching metadata from API...`);
      }
      const metadata = await fetchUrlMetadata(url);
      
      if (process.env.NODE_ENV === "development" && enabled && !hasCachedData) {
        const endTime = performance.now();
        console.log(
          `✅ [HOOK FETCH ${url.slice(0, 30)}...] Metadata fetched in ${(endTime - startTime).toFixed(2)}ms`
        );
      }

      // Save to localStorage for persistence
      saveQueryDataToLocalStorage(queryKey, metadata);
      return metadata;
    },
    enabled: enabled && !!url,
    // CRITICAL: Cache forever until invalidated (after mutations/SSE)
    // With staleTime: Infinity, data never becomes stale automatically
    // Only becomes stale when manually invalidated, then refetches once
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts
    initialData: cachedData || initialData, // Use React Query cache or localStorage data
    placeholderData: cachedData || initialData, // Also use as placeholder while loading
    // CRITICAL: Refetch only when stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    // Normal navigation uses cache instantly (no API calls)
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    // Only show loading state if we truly don't have data (not even cached)
    // This prevents skeletons from showing when data exists in React Query cache
    notifyOnChangeProps: ["data", "error"],
  });

  // Override isLoading to be false if we have cached data (even if query is fetching in background)
  // This ensures cards don't show skeletons when cached data exists
  const isLoading = hasCachedData ? false : query.isLoading;

  // Log React Query status (only once when using cache)
  if (query.data && initialData && !query.isFetching) {
    // Silently using cache - no log needed as Cache HIT already logged
    // Uncomment below if you want to see when React Query uses the cache
    // console.log(`⚡ [INSTANT] ${url}`);
  }

  // Return query with overridden isLoading to prevent skeletons when cached data exists
  return {
    ...query,
    isLoading,
  };
}
