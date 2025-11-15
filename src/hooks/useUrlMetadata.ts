import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchUrlMetadata, type UrlMetadata } from "@/utils/urlMetadata";
import {
  loadQueryDataFromLocalStorage,
  saveQueryDataToLocalStorage,
} from "@/lib/react-query";

export function useUrlMetadata(url: string, enabled: boolean = true) {
  // Memoize queryKey to prevent infinite loops
  const queryKey = useMemo(() => ["url-metadata", url] as const, [url]);

  // Load from localStorage once for initial data
  const initialData = useMemo(() => {
    if (enabled && url) {
      const cached = loadQueryDataFromLocalStorage(queryKey);
      // Reduced logging - only log actual API fetches
      return cached;
    }
    return undefined;
    // Only depend on enabled and url since queryKey is derived from url
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url]);

  const query = useQuery<UrlMetadata>({
    queryKey,
    queryFn: async () => {
      // Reduced logging - only log if not from cache
      if (!initialData) {
        console.log(`🌐 [API FETCH] Fetching metadata for ${url}...`);
      }
      const startTime = performance.now();
      const metadata = await fetchUrlMetadata(url);
      const endTime = performance.now();
      
      if (!initialData) {
        console.log(
          `✅ [API FETCH] Metadata fetched in ${(endTime - startTime).toFixed(2)}ms`
        );
      }

      // Save to localStorage for persistence
      saveQueryDataToLocalStorage(queryKey, metadata);
      return metadata;
    },
    enabled: enabled && !!url,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - data is fresh for 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - cache persists for 7 days
    initialData, // Use localStorage data as initial data
    placeholderData: initialData, // Also use as placeholder while loading
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Log React Query status (only once when using cache)
  if (query.data && initialData && !query.isFetching) {
    // Silently using cache - no log needed as Cache HIT already logged
    // Uncomment below if you want to see when React Query uses the cache
    // console.log(`⚡ [INSTANT] ${url}`);
  }

  return query;
}
