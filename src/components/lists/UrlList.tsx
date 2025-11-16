"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useStore } from "@nanostores/react";
import {
  currentList,
  addUrlToList,
  removeUrlFromList,
  updateUrlInList,
  toggleUrlFavorite,
  getList,
  setDragInProgress,
  type UrlItem,
} from "@/stores/urlListStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useUrlMetadata } from "@/hooks/useUrlMetadata";
import { useQueryClient } from "@tanstack/react-query";
import { fetchUrlMetadata, type UrlMetadata } from "@/utils/urlMetadata";
import { UrlCard } from "./UrlCard";
import { UrlEditModal } from "./UrlEditModal";
import {
  PlusIcon,
  LinkIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";
import type { EnhancementResult } from "@/lib/ai";
import { useDebounce } from "@/hooks/useDebounce";
import type { SearchResult } from "@/lib/ai/search";
import { useToast } from "@/components/ui/Toaster";
import { useRealtimeList } from "@/hooks/useRealtimeList";

// Component wrapper that fetches metadata using React Query for each URL
function UrlCardWrapper({
  url,
  provided,
  snapshot,
  onEdit,
  onDelete,
  onToggleFavorite,
  onShare,
  onUrlClick,
  onDuplicate,
  onArchive,
  onPin,
  shareTooltip,
  isMetadataReady,
}: {
  url: UrlItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provided: {
    innerRef: (element: HTMLElement | null) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draggableProps: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dragHandleProps: any;
  };
  snapshot: {
    isDragging: boolean;
  };
  onEdit: (url: UrlItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onShare: (url: { url: string; title?: string }) => void;
  onUrlClick?: (urlId: string) => void;
  onDuplicate?: (url: UrlItem) => void;
  onArchive?: (id: string) => void;
  onPin?: (id: string) => void;
  shareTooltip: string | null;
  isMetadataReady: boolean;
}) {
  const queryClient = useQueryClient();
  
  // Check if metadata is already in cache (from batch fetch)
  // IMPORTANT: Check cache on every render to catch hydration that happens after mount
  const queryKey = ["url-metadata", url.url] as const;
  const cachedMetadata = queryClient.getQueryData<UrlMetadata>(queryKey);
  const hasCache = !!cachedMetadata;
  
  // Only enable individual fetch if:
  // 1. Batch metadata is ready (has run)
  // 2. AND metadata is NOT in cache (truly missing)
  // This prevents individual API calls when batch fetch has populated cache
  const shouldFetch = isMetadataReady && !hasCache;
  
  // Log cache check for this URL (only log once to reduce noise)
  if (hasCache) {
    console.log(`💾 [CARD ${url.url.slice(0, 30)}...] Using cached metadata from batch fetch`);
  } else if (!isMetadataReady) {
    console.log(`⏳ [CARD ${url.url.slice(0, 30)}...] Waiting for batch fetch to complete (shouldFetch=false)`);
  } else {
    console.log(`🔄 [CARD ${url.url.slice(0, 30)}...] No cache found after batch, will fetch individually (shouldFetch: ${shouldFetch})`);
  }
  
  // Use React Query hook to fetch and cache metadata
  // Disabled until batch fetch completes to prevent duplicate calls
  const { data: metadata, isLoading: isLoadingMetadata } = useUrlMetadata(
    url.url,
    shouldFetch // Only fetch if batch is ready AND data not in cache
  );
  
  // Use cached data if available, otherwise use hook data
  const finalMetadata = cachedMetadata || metadata;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={snapshot.isDragging ? "opacity-50" : ""}
    >
      <div
        className={`flex-1 transition-all duration-200 ${
          snapshot.isDragging ? "dragging shadow-2xl" : ""
        }`}
      >
        <UrlCard
          url={url}
          metadata={finalMetadata}
          isLoadingMetadata={isLoadingMetadata && !cachedMetadata}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onShare={onShare}
          onUrlClick={onUrlClick}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onPin={onPin}
          shareTooltip={shareTooltip}
          dragHandleProps={provided.dragHandleProps}
        />
      </div>
    </div>
  );
}

export function UrlList() {
  const list = useStore(currentList);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState("");

  // Listen for metadata refresh events to invalidate cache
  useEffect(() => {
    const handleMetadataRefresh = () => {
      // Invalidate all metadata queries to force re-fetch with improved extractor
      queryClient.invalidateQueries({ queryKey: ["url-metadata"] });
      // Also clear localStorage cache for metadata
      if (typeof window !== "undefined" && window.localStorage) {
        const keys = Object.keys(window.localStorage);
        keys.forEach((key) => {
          if (key.startsWith("react-query:url-metadata:")) {
            window.localStorage.removeItem(key);
          }
        });
      }
    };

    window.addEventListener("metadata-refresh-complete", handleMetadataRefresh);
    return () => {
      window.removeEventListener("metadata-refresh-complete", handleMetadataRefresh);
    };
  }, [queryClient]);
  const [error, setError] = useState<string>();
  const [editingUrl, setEditingUrl] = useState<UrlItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [shareTooltip, setShareTooltip] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<
    "latest" | "oldest" | "az" | "za" | "favourite" | "reminders"
  >("latest");
  const [search, setSearch] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingTags, setEditingTags] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [editingReminder, setEditingReminder] = useState<string>("");
  const [newTags, setNewTags] = useState<string>("");
  const [enhancementResult, setEnhancementResult] =
    useState<EnhancementResult | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [smartSearchResults, setSmartSearchResults] = useState<
    SearchResult[] | null
  >(null);
  const [searchCacheIndicator, setSearchCacheIndicator] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>("");

  // REMOVED optimisticUrls state - using store directly for immediate updates

  // Real-time updates subscription
  useRealtimeList(list?.id || null);

  // Fetch all metadata from unified API endpoint when list loads
  // This acts as a middleware/proxy layer that returns all metadata instantly
  // IMPORTANT: This must run BEFORE cards render to prevent individual API calls
  const prefetchedMetadataRef = useRef<string | null>(null);
  const batchFetchCompleteRef = useRef<string | null>(null); // Track completed batch fetches
  
  // CRITICAL: Compute isMetadataReady SYNCHRONOUSLY during render (not from state)
  // This prevents race condition where hooks run before useLayoutEffect
  const currentListHash = list?.id && list?.urls 
    ? `${list.id}:${(list.urls as unknown as UrlItem[]).map((u) => u.url).join("|")}`
    : "";
  
  // Compute isMetadataReady directly from refs and cache (synchronous, no state delay)
  const isMetadataReady = useMemo(() => {
    if (!list?.id || !list?.urls || list.urls.length === 0) {
      return true; // No list = ready (nothing to fetch)
    }
    
    // Check if this exact list+URLs combo has been prefetched AND completed
    const urls = list.urls as unknown as UrlItem[];
    const urlsHash = urls.map((u) => u.url).join("|");
    const listId = list.id;
    const prefetchKey = `${listId}:${urlsHash}`;
    
    // If batch hasn't completed for this list, we're not ready
    if (batchFetchCompleteRef.current !== prefetchKey) {
      return false;
    }
    
    // If batch completed, check if all URLs are cached
    const uniqueUrls = Array.from(new Set(urls.map((u) => u.url)));
    const allCached = uniqueUrls.every((url) => {
      const queryKey = ["url-metadata", url] as const;
      return !!queryClient.getQueryData<UrlMetadata>(queryKey);
    });
    
    return allCached;
  }, [list?.id, list?.urls, queryClient, currentListHash]);
  
  useEffect(() => {
    const current = currentList.get();
    if (!current?.id || !current?.urls || current.urls.length === 0) {
      batchFetchCompleteRef.current = null;
      return;
    }

    const listId = current.id;
    const urls = current.urls as unknown as UrlItem[];
    const urlsHash = urls.map((u) => u.url).join("|");
    const urlCount = new Set(urls.map((u) => u.url)).size;
    const prefetchKey = `${listId}:${urlsHash}`;
    
    // Skip if already prefetched AND completed
    if (batchFetchCompleteRef.current === prefetchKey) {
      const uniqueUrls = Array.from(new Set(urls.map((u) => u.url)));
      const allCached = uniqueUrls.every((url) => {
        const queryKey = ["url-metadata", url] as const;
        return !!queryClient.getQueryData<UrlMetadata>(queryKey);
      });
      if (allCached) {
        console.log(`⏭️ [BATCH] Already prefetched and cached for this list state (${urlCount} unique URLs)`);
        return; // Already done
      }
      // Cache incomplete, need to re-fetch
      batchFetchCompleteRef.current = null;
    }
    
    // Skip if currently prefetching (wait for it to complete)
    if (prefetchedMetadataRef.current === prefetchKey) {
      console.log(`⏳ [BATCH] Batch fetch already in progress for this list...`);
      return;
    }
    
    const fetchAllMetadata = async () => {
      // Mark as prefetching
      prefetchedMetadataRef.current = prefetchKey;
      console.log(`🚀 [BATCH] Starting batch metadata fetch for ${urlCount} unique URLs (list: ${listId})`);

      try {
        const startTime = performance.now();
        // Fetch all metadata from unified endpoint (cached in Redis)
        // This is the SINGLE API call that replaces 9 individual calls
        console.log(`🔄 [BATCH] Calling unified endpoint: /api/lists/${listId}/metadata`);
        const response = await fetch(`/api/lists/${listId}/metadata`);
        const fetchTime = performance.now() - startTime;
        
        if (response.ok) {
          const { metadata, cached } = await response.json();
          
          if (cached) {
            console.log(`⚡ [BATCH CACHE HIT] All metadata loaded instantly from Redis cache (${fetchTime.toFixed(2)}ms)`);
          } else {
            console.log(`🔄 [BATCH CACHE MISS] Fetched all metadata from web (${fetchTime.toFixed(2)}ms), now cached for future requests`);
          }
          
          const metadataCount = Object.keys(metadata).length;
          console.log(`📦 [BATCH] Received ${metadataCount} metadata entries, hydrating React Query cache...`);
          
          // Hydrate React Query cache and localStorage with all metadata instantly
          // CRITICAL: This happens synchronously, so cards will see cache immediately
          let hydratedCount = 0;
          Object.entries(metadata).forEach(([url, metaData]) => {
            const queryKey = ["url-metadata", url] as const;
            const meta = metaData as UrlMetadata;
            
            // Check if already in cache
            const existingCache = queryClient.getQueryData<UrlMetadata>(queryKey);
            if (!existingCache) {
              // Set in React Query cache (instant, synchronous)
              queryClient.setQueryData(queryKey, meta);
              hydratedCount++;
              console.log(`  💧 [BATCH] Hydrated cache for: ${url.slice(0, 40)}...`);
            }
            
            // Also save to localStorage for persistence
            try {
              const key = `react-query:${queryKey.join(":")}`;
              localStorage.setItem(key, JSON.stringify({ 
                data: meta, 
                timestamp: Date.now() 
              }));
            } catch {
              // Ignore localStorage errors
            }
          });
          
          console.log(`✅ [BATCH] Hydrated ${hydratedCount} new entries into React Query cache (${metadataCount - hydratedCount} already cached)`);
          
          // CRITICAL: Mark batch as complete AFTER cache hydration
          // This makes isMetadataReady=true on next render (computed synchronously)
          batchFetchCompleteRef.current = prefetchKey;
          
          // Force a React Query cache update notification to trigger re-renders
          // This ensures cards see the newly hydrated cache immediately
          queryClient.invalidateQueries({ queryKey: ["url-metadata"], exact: false, refetchType: "none" });
          
          console.log(`🎯 [BATCH] Batch fetch complete, isMetadataReady=true (will be computed on next render)`);
        } else {
          console.error(`❌ [BATCH] API error: ${response.status} ${response.statusText}`);
          prefetchedMetadataRef.current = null; // Reset on error
        }
      } catch (error) {
        console.error(`❌ [BATCH] Failed to fetch batch metadata:`, error);
        prefetchedMetadataRef.current = null; // Reset on error
        
        // Fallback to individual prefetching if batch endpoint fails
        const uniqueUrls = Array.from(new Set(urls.map((u) => u.url)));
        
        // Load from localStorage first (instant)
        uniqueUrls.forEach((url) => {
          const queryKey = ["url-metadata", url] as const;
          const localStorageKey = `react-query:${queryKey.join(":")}`;
          try {
            const item = localStorage.getItem(localStorageKey);
            if (item) {
              const parsed = JSON.parse(item);
              const age = Date.now() - parsed.timestamp;
              if (age < 1000 * 60 * 60 * 24 * 7 && parsed.data) {
                queryClient.setQueryData(queryKey, parsed.data);
              }
            }
          } catch {
            // Ignore localStorage errors
          }
        });

        // Prefetch missing ones individually (fallback only)
        const urlsToFetch = uniqueUrls.filter((url) => {
          const queryKey = ["url-metadata", url] as const;
          return !queryClient.getQueryData(queryKey);
        });

        // Fetch in batches
        const concurrency = 5;
        for (let i = 0; i < urlsToFetch.length; i += concurrency) {
          const batch = urlsToFetch.slice(i, i + concurrency);
          await Promise.allSettled(
            batch.map((url) =>
              queryClient.prefetchQuery({
                queryKey: ["url-metadata", url] as const,
                queryFn: () => fetchUrlMetadata(url),
                staleTime: 1000 * 60 * 60 * 24,
              }).catch(() => {
                // Silently fail
              })
            )
          );
        }
        
        // Mark as complete after fallback fetch
        batchFetchCompleteRef.current = prefetchKey;
      }
    };

    // Fetch metadata IMMEDIATELY when list loads (no delay to prevent individual calls)
    fetchAllMetadata();
  }, [list?.id, list?.urls, queryClient]);

  // Track if we're currently performing a local operation to prevent refresh loops
  const isLocalOperationRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);
  const lastDragEndTimeRef = useRef<number>(0); // Track when drag ended
  const lastDragUpdateRef = useRef<string>(""); // Track last drag update to prevent excessive updates

  // Listen for real-time update events (debounced to prevent loops)
  useEffect(() => {
    const handleListUpdate = async (event: Event) => {
      // Skip refresh if we're performing a local operation or dragging (avoid loop/interference)
      if (isLocalOperationRef.current || isDraggingRef.current) {
        console.log(
          "⏭️ [REALTIME] Skipping refresh - local operation or drag in progress"
        );
        return;
      }

      const now = Date.now();

      // Prevent refreshing if we just completed a drag operation (protect optimistic state)
      if (now - lastDragEndTimeRef.current < 5000) {
        console.log(
          "⏭️ [REALTIME] Skipping refresh - drag operation just completed (protecting optimistic state)"
        );
        return;
      }

      const customEvent = event as CustomEvent<{
        listId: string;
        timestamp?: string;
        action?: string;
      }>;
      const current = currentList.get();

      // Only refresh if this is the current list
      if (current?.id === customEvent.detail.listId && current?.slug) {
        // Check if this is a metadata change (like visibility toggle) - these need immediate updates
        const isMetadataChange =
          customEvent.detail.action === "list_made_public" ||
          customEvent.detail.action === "list_made_private" ||
          customEvent.detail.action === "list_updated";

        // For metadata changes, use shorter throttle or force refresh
        const throttleWindow = isMetadataChange ? 2000 : 5000; // 2s for metadata, 5s for others

        // If we're within throttle window, queue the refresh for after throttle expires
        const timeSinceLastRefresh = now - lastRefreshRef.current;
        if (timeSinceLastRefresh < throttleWindow) {
          const remainingTime = throttleWindow - timeSinceLastRefresh;
          console.log(
            `⏭️ [REALTIME] Throttling refresh (${remainingTime}ms remaining), queuing for later...`
          );

          // Clear any existing queued refresh
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }

          // Queue refresh to happen after throttle expires
          refreshTimeoutRef.current = setTimeout(async () => {
            const now = Date.now();
            if (
              !isLocalOperationRef.current &&
              !isDraggingRef.current &&
              now - lastDragEndTimeRef.current >= 5000 &&
              current.slug
            ) {
              console.log(
                "🔄 [REALTIME] Executing queued refresh from real-time update"
              );
              lastRefreshRef.current = now;
              await getList(current.slug, true);
            }
          }, remainingTime + 100); // Add 100ms buffer
          return;
        }

        // Clear any pending refresh
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }

        // For metadata changes, refresh immediately (no debounce)
        if (isMetadataChange) {
          console.log(
            "🔄 [REALTIME] Refreshing list immediately (metadata change)"
          );
          lastRefreshRef.current = now;
          await getList(current.slug, true);
          return;
        }

        // For other changes, debounce to batch rapid updates
        refreshTimeoutRef.current = setTimeout(async () => {
          const now = Date.now();
          if (
            !isLocalOperationRef.current &&
            !isDraggingRef.current &&
            now - lastDragEndTimeRef.current >= 5000 &&
            current.slug
          ) {
            console.log("🔄 [REALTIME] Refreshing list from real-time update");
            lastRefreshRef.current = now;
            await getList(current.slug, true);
          }
        }, 1000); // 1 second delay to batch multiple rapid updates
      }
    };

    window.addEventListener("list-updated", handleListUpdate);
    return () => {
      window.removeEventListener("list-updated", handleListUpdate);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Debounce search query for smart search (only trigger after 500ms of no typing)
  const debouncedSearch = useDebounce(search, 500);

  // Smart search with AI + Redis caching
  useEffect(() => {
    const performSmartSearch = async () => {
      const current = currentList.get();
      if (!current.id || !debouncedSearch.trim()) {
        setSmartSearchResults(null);
        setIsSearching(false);
        return;
      }

      // Clear previous results immediately when starting new search
      // This prevents showing stale results from previous search
      setSmartSearchResults(null);
      setIsSearching(true);
      setSearchCacheIndicator(false);
      const currentSearchQuery = debouncedSearch.trim();

      try {
        const response = await fetch(
          `/api/search/smart?q=${encodeURIComponent(
            currentSearchQuery
          )}&listId=${current.id}`
        );

        if (response.ok) {
          const data = await response.json();
          // Only set results if the debounced search hasn't changed
          // (race condition protection)
          setSmartSearchResults(data.results || []);
          setSearchCacheIndicator(data.cached || false);
          setLastSearchedQuery(currentSearchQuery);
        } else {
          // On error, set empty array (not null) so we know search completed with no results
          setSmartSearchResults([]);
          setLastSearchedQuery(currentSearchQuery);
        }
      } catch (error) {
        console.error("Smart search failed:", error);
        // On error, set empty array (not null) so we know search completed with no results
        setSmartSearchResults([]);
        setLastSearchedQuery(currentSearchQuery);
      } finally {
        setIsSearching(false);
      }
    };

    performSmartSearch();
  }, [debouncedSearch]);

  // Reset smart search when search is cleared
  useEffect(() => {
    if (!search.trim()) {
      setSmartSearchResults(null);
      setIsSearching(false);
      setSearchCacheIndicator(false);
      setLastSearchedQuery("");
    }
  }, [search]);

  // Track URL clicks
  const handleUrlClick = async (urlId: string) => {
    const current = currentList.get();
    if (!current.id || !current.urls) return;

    const currentUrls = current.urls as unknown as UrlItem[];
    const urlToUpdate = currentUrls.find((u) => u.id === urlId);
    if (!urlToUpdate) return;

    // Update click count optimistically
    const updatedUrl = {
      ...urlToUpdate,
      clickCount: (urlToUpdate.clickCount || 0) + 1,
    };
    const updatedUrls = currentUrls.map((u) =>
      u.id === urlId ? updatedUrl : u
    );

    // Update store immediately
    flushSync(() => {
      currentList.set({ ...current, urls: updatedUrls });
    });

    try {
      const response = await fetch(
        `/api/lists/${current.id}/urls/${urlId}/click`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const { list } = await response.json();
        // Merge server response
        const serverUrls = (list.urls as unknown as UrlItem[]) || [];
        const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));
        const finalUrls = updatedUrls.map((url) => {
          const serverUrl = serverUrlMap.get(url.id);
          return serverUrl ? { ...url, ...serverUrl } : url;
        });
        currentList.set({ ...list, urls: finalUrls });
      }
    } catch (error) {
      console.error("Failed to track URL click:", error);
      // Don't show error to user, just log it
    }
  };

  // Create a component that uses the metadata hook for each URL
  // This will be used in the render to fetch metadata with React Query caching

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsLoading(true);

    // Set flag to prevent real-time refresh during add operation
    isLocalOperationRef.current = true;

    try {
      const url = new URL(newUrl);
      // Fetch metadata - React Query will cache it automatically
      const metadata = await fetchUrlMetadata(url.toString());

      // Use enhanced tags if available, otherwise use manually entered tags
      const tagsToUse = newTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await addUrlToList(
        url.toString(),
        metadata.title,
        tagsToUse.length > 0 ? tagsToUse : undefined,
        newNote || enhancementResult?.summary || "",
        undefined, // reminder
        enhancementResult?.category // AI-generated category
      );
      // Pre-populate the query cache so it's available immediately
      queryClient.setQueryData(["url-metadata", url.toString()], metadata);
      
      // Also save to localStorage for persistence
      const queryKey = ["url-metadata", url.toString()] as const;
      try {
        const key = `react-query:${queryKey.join(":")}`;
        localStorage.setItem(key, JSON.stringify({ data: metadata, timestamp: Date.now() }));
      } catch {
        // Ignore localStorage errors
      }
      
      setNewUrl("");
      setNewNote("");
      setNewTags("");
      setEnhancementResult(null);
    } catch {
      setError("Please enter a valid URL");
    } finally {
      setIsLoading(false);
      // Clear the flag after a delay
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 2000);
    }
  };

  const handleEditUrl = async (
    id: string,
    title: string,
    url: string,
    tags?: string[],
    notes?: string,
    reminder?: string
  ) => {
    setIsEditing(true);
    setError(undefined);
    // Set flag to prevent real-time refresh during edit operation
    isLocalOperationRef.current = true;

    const current = currentList.get();
    if (!current.urls || !current.id) return;

    try {
      // Get the current URL to check if it changed
      const currentUrl = list?.urls?.find((u) => u.id === id);
      const urlChanged = currentUrl && currentUrl.url !== url;

      // Prepare updates
      const updates: Partial<UrlItem> = { title, url };
      if (tags !== undefined) updates.tags = tags;
      if (notes !== undefined) updates.notes = notes;
      if (reminder !== undefined) updates.reminder = reminder;

      // updateUrlInList handles optimistic updates internally
      // It will update the store immediately and sync with server
      await updateUrlInList(id, updates);

      // If URL changed, invalidate old query and fetch new metadata
      if (urlChanged && currentUrl) {
        // Remove old query cache
        queryClient.removeQueries({
          queryKey: ["url-metadata", currentUrl.url],
        });

        // Fetch new metadata and cache it
        const metadata = await fetchUrlMetadata(url);
        queryClient.setQueryData(["url-metadata", url], metadata);
      }

      // Show success toast
      toast({
        title: "URL Updated",
        description: `"${title || url}" has been updated successfully.`,
        variant: "success",
      });

      setEditingUrl(null);
      setEditingTags("");
      setEditingNotes("");
      setEditingReminder("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update URL";
      setError(errorMessage);
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setIsEditing(false);
      // Clear the flag after a delay
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 1000);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    // Set flag for favorite operation
    isLocalOperationRef.current = true;

    const current = currentList.get();
    if (!current.urls || !current.id) return;

    const currentUrls = current.urls as unknown as UrlItem[];
    const urlToToggle = currentUrls.find((u) => u.id === id);
    if (!urlToToggle) return;

    // Toggle favorite status optimistically
    const updatedUrl = { ...urlToToggle, isFavorite: !urlToToggle.isFavorite };
    const updatedUrls = currentUrls.map((u) => (u.id === id ? updatedUrl : u));

    // Update store immediately
    flushSync(() => {
      currentList.set({ ...current, urls: updatedUrls });
    });

    // Trigger activity feed update immediately
    window.dispatchEvent(
      new CustomEvent("activity-updated", {
        detail: { listId: current.id },
      })
    );

    try {
      // Use updateUrlInList which will sync with server
      await updateUrlInList(id, { isFavorite: updatedUrl.isFavorite });
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      // Revert on error
      if (current.slug) {
        await getList(current.slug);
      }
    } finally {
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 1000);
    }
  };

  const handleDuplicate = async (urlToDuplicate: UrlItem) => {
    // Set flag for duplicate operation
    isLocalOperationRef.current = true;

    try {
      const newUrl: UrlItem = {
        ...urlToDuplicate,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      };

      const current = currentList.get();
      if (!current.urls || !current.id) return;

      const currentUrls = current.urls as unknown as UrlItem[];
      const updatedUrls = [...currentUrls, newUrl];

      // Optimistic update - add immediately
      flushSync(() => {
        currentList.set({ ...current, urls: updatedUrls });
      });

      const response = await fetch(`/api/lists/${current.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: updatedUrls, action: "url_added" }),
      });

      if (!response.ok) throw new Error("Failed to duplicate URL");

      const { list } = await response.json();

      // Merge server response with optimistic state
      const serverUrls = (list.urls as unknown as UrlItem[]) || [];
      const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));
      const finalUrls = updatedUrls.map((url) => {
        const serverUrl = serverUrlMap.get(url.id);
        return serverUrl ? { ...url, ...serverUrl } : url;
      });

      currentList.set({ ...list, urls: finalUrls });

      // Trigger activity feed update AFTER API call completes (activity is now in DB)
      window.dispatchEvent(
        new CustomEvent("activity-updated", {
          detail: { listId: current.id },
        })
      );
    } catch (err) {
      console.error("Failed to duplicate URL:", err);
      // Revert on error
      const current = currentList.get();
      if (current?.slug) {
        await getList(current.slug);
      }
    } finally {
      // Clear the flag after a delay
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 1000);
    }
  };

  const handleArchive = async (id: string) => {
    const { archiveUrlFromList } = await import("@/stores/urlListStore");
    await archiveUrlFromList(id);
  };

  const handlePin = async (id: string) => {
    // Set flag for pin operation
    isLocalOperationRef.current = true;

    const current = currentList.get();
    if (!current.urls || !current.id) return;

    const urlToPin = current.urls.find((u) => u.id === id);
    if (!urlToPin) return;

    // Toggle pin status
    const isCurrentlyPinned = urlToPin.isPinned || false;
    const updatedUrl = { ...urlToPin, isPinned: !isCurrentlyPinned };

    // Update the URL in the list
    const currentUrls = current.urls as unknown as UrlItem[];
    const updatedUrls = currentUrls.map((u) => (u.id === id ? updatedUrl : u));

    // Optimistic update - update store immediately
    flushSync(() => {
      currentList.set({ ...current, urls: updatedUrls });
    });

    try {
      const response = await fetch(`/api/lists/${current.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: updatedUrls, action: "url_updated" }),
      });

      if (!response.ok) throw new Error("Failed to pin URL");

      const { list } = await response.json();

      // Merge server response with optimistic state
      const serverUrls = (list.urls as unknown as UrlItem[]) || [];
      const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));
      const finalUrls = updatedUrls.map((url) => {
        const serverUrl = serverUrlMap.get(url.id);
        return serverUrl ? { ...url, ...serverUrl } : url;
      });

      currentList.set({ ...list, urls: finalUrls });

      // Trigger activity feed update AFTER API call completes (activity is now in DB)
      window.dispatchEvent(
        new CustomEvent("activity-updated", {
          detail: { listId: current.id },
        })
      );
    } catch (err) {
      console.error("Failed to pin URL:", err);
      // Revert on error
      if (current.slug) {
        await getList(current.slug);
      }
    } finally {
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 1000);
    }
  };

  const handleShare = async (url: { url: string; title?: string }) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: url.title || "Shared URL from Urlist",
          text: url.title,
          url: url.url,
        });
        // Share successful - no need to show anything
      } catch (err) {
        // Ignore AbortError - user just cancelled the share dialog
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Error sharing:", err);
        // Fallback to clipboard on other errors
        try {
          await navigator.clipboard.writeText(url.url);
          setShareTooltip("URL copied to clipboard!");
          setTimeout(() => setShareTooltip(null), 2000);
        } catch {
          setShareTooltip("Failed to share");
          setTimeout(() => setShareTooltip(null), 2000);
        }
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(url.url);
        setShareTooltip("URL copied to clipboard!");
        setTimeout(() => setShareTooltip(null), 2000);
      } catch (err) {
        console.error("Error copying to clipboard:", err);
        setShareTooltip("Failed to copy URL");
        setTimeout(() => setShareTooltip(null), 2000);
      }
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      // Clear flags immediately if no destination
      isDraggingRef.current = false;
      setDragInProgress(false);
      return;
    }
    if (result.destination.index === result.source.index) {
      // Clear flags immediately if no actual movement
      isDraggingRef.current = false;
      setDragInProgress(false);
      return;
    }

    // Prevent multiple simultaneous drag operations
    if (isDraggingRef.current) {
      console.warn("⚠️ [DRAG] Drag operation already in progress, skipping");
      return;
    }

    isDraggingRef.current = true;
    setDragInProgress(true); // Set global flag
    const current = currentList.get();
    if (!current.urls || !current.id) {
      isDraggingRef.current = false;
      setDragInProgress(false);
      return;
    }

    // Set flag to prevent real-time refresh during drag operation
    isLocalOperationRef.current = true;

    // If filtering/sorting is active, disable drag-and-drop for now
    // Or we can work with visible items only
    const isFilteringActive = search.trim() || sortOption !== "latest";

    if (isFilteringActive) {
      // For filtered/sorted views, reorder based on visible items only
      const visibleIds = filteredAndSortedUrls.map((u) => u.id);
      const reorderedVisible = [...visibleIds];
      const [movedId] = reorderedVisible.splice(result.source.index, 1);
      reorderedVisible.splice(result.destination.index, 0, movedId);

      // Build new order: visible items in new order, then hidden items in original order
      const hiddenIds = current.urls
        .filter((u) => !visibleIds.includes(u.id))
        .map((u) => u.id);

      const newOrder = [...reorderedVisible, ...hiddenIds];
      const reorderedUrls = newOrder
        .map((id) => current.urls!.find((u) => u.id === id))
        .filter((u): u is UrlItem => u !== undefined);

      // Store is already updated from onDragUpdate, but ensure it's correct
      // Double-check the order matches what we expect
      const currentState = currentList.get();
      const stateUrls = (currentState?.urls as unknown as UrlItem[]) || [];
      const stateOrder = stateUrls.map((u) => u.id).join(",");
      const expectedOrder = reorderedUrls.map((u) => u.id).join(",");

      if (stateOrder !== expectedOrder) {
        // Order doesn't match - update it
        console.log("🔄 [DRAG] Correcting store order (filtered)");
        flushSync(() => {
          currentList.set({ ...current, urls: reorderedUrls });
        });
      } else {
        console.log("🔄 [DRAG] Store order already correct (filtered)");
      }

      // Call API immediately (no delay needed - store is already updated)
      try {
        const response = await fetch(`/api/lists/${current.id}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: reorderedUrls,
            action: "url_reordered",
          }),
        });
        if (response.ok) {
          const { list } = await response.json();
          // Verify the order matches our optimistic update
          const currentState = currentList.get();
          const currentUrls =
            (currentState?.urls as unknown as UrlItem[]) || [];
          const serverUrls = (list.urls as unknown as UrlItem[]) || [];
          const currentOrder = currentUrls.map((u) => u.id).join(",");
          const serverOrder = serverUrls.map((u) => u.id).join(",");

          // Only update if server order is different AND we're not dragging
          if (currentOrder !== serverOrder && !isDraggingRef.current) {
            console.log(
              "🔄 [DRAG] Server order differs (filtered), updating from server"
            );
            currentList.set(list);
          } else {
            // Server confirmed our order - keep optimistic state
            console.log(
              "✅ [DRAG] Server confirmed order (filtered), keeping optimistic state"
            );
            // Ensure our optimistic state is preserved
            if (currentOrder === serverOrder) {
              const mergedList = {
                ...list,
                urls: currentUrls, // Keep our optimistic order
              };
              currentList.set(mergedList);
            }
          }

          // Trigger activity feed update AFTER API call completes (activity is now in DB)
          window.dispatchEvent(
            new CustomEvent("activity-updated", {
              detail: { listId: current.id },
            })
          );
        }
      } catch (err) {
        console.error("Failed to reorder URLs:", err);
        // Revert on error - fetch the current list
        const currentSlug = currentList.get().slug;
        if (currentSlug) {
          await getList(currentSlug);
        }
      } finally {
        // Clear flags IMMEDIATELY after API call completes
        // Track timestamp for real-time protection (but don't block next drag)
        const dragEndTime = Date.now();
        lastDragEndTimeRef.current = dragEndTime;

        isLocalOperationRef.current = false;
        isDraggingRef.current = false;
        setDragInProgress(false);
        lastDragUpdateRef.current = ""; // Reset drag update tracking
        console.log("✅ [DRAG] Cleared drag flags (filtered view)");
      }
    } else {
      // Simple reorder when no filtering/sorting
      const currentUrls = current.urls as unknown as UrlItem[];
      const reorderedUrls = [...currentUrls];
      const [movedUrl] = reorderedUrls.splice(result.source.index, 1);
      reorderedUrls.splice(result.destination.index, 0, movedUrl);

      // Optimistically update the UI immediately - this is critical for UX
      // Use a synchronous update to ensure React sees it immediately
      console.log("🔄 [DRAG] Optimistically updating UI immediately");
      console.log(
        "🔄 [DRAG] New order:",
        reorderedUrls.map((u) => u.id).join(",")
      );
      console.log(
        "🔄 [DRAG] Old order:",
        currentUrls.map((u) => u.id).join(",")
      );

      // Store is already updated from onDragUpdate, but ensure it's correct
      // Double-check the order matches what we expect
      const currentState = currentList.get();
      const stateUrls = (currentState?.urls as unknown as UrlItem[]) || [];
      const stateOrder = stateUrls.map((u) => u.id).join(",");
      const expectedOrder = reorderedUrls.map((u) => u.id).join(",");

      if (stateOrder !== expectedOrder) {
        // Order doesn't match - update it
        console.log("🔄 [DRAG] Correcting store order");
        flushSync(() => {
          currentList.set({ ...current, urls: reorderedUrls });
        });
      } else {
        console.log("🔄 [DRAG] Store order already correct");
      }

      console.log(
        "🔄 [DRAG] Store updated - Order:",
        reorderedUrls.map((u) => u.id).join(",")
      );

      // Call API immediately (no delay needed - store is already updated)
      try {
        const response = await fetch(`/api/lists/${current.id}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: reorderedUrls,
            action: "url_reordered",
          }),
        });
        if (response.ok) {
          const { list } = await response.json();
          // Verify the order matches our optimistic update
          const currentState = currentList.get();
          const currentUrls =
            (currentState?.urls as unknown as UrlItem[]) || [];
          const serverUrls = (list.urls as unknown as UrlItem[]) || [];
          const currentOrder = currentUrls.map((u) => u.id).join(",");
          const serverOrder = serverUrls.map((u) => u.id).join(",");

          // Only update if server order is different AND we're not dragging
          if (currentOrder !== serverOrder && !isDraggingRef.current) {
            console.log("🔄 [DRAG] Server order differs, updating from server");
            currentList.set(list);
          } else {
            // Server confirmed our order - keep optimistic state
            console.log(
              "✅ [DRAG] Server confirmed order, keeping optimistic state"
            );
            // Ensure our optimistic state is preserved (don't overwrite with server response)
            if (currentOrder === serverOrder) {
              // Order matches, but update other fields from server (like timestamps)
              const mergedList = {
                ...list,
                urls: currentUrls, // Keep our optimistic order
              };
              currentList.set(mergedList);
            }
          }

          // Trigger activity feed update AFTER API call completes (activity is now in DB)
          window.dispatchEvent(
            new CustomEvent("activity-updated", {
              detail: { listId: current.id },
            })
          );
        }
      } catch (err) {
        console.error("❌ [DRAG] Failed to reorder URLs:", err);
        // Revert on error - fetch the current list
        const currentSlug = currentList.get().slug;
        if (currentSlug) {
          await getList(currentSlug);
        }
      } finally {
        // Clear flags IMMEDIATELY after API call completes
        // Track timestamp for real-time protection (but don't block next drag)
        const dragEndTime = Date.now();
        lastDragEndTimeRef.current = dragEndTime;

        isLocalOperationRef.current = false;
        isDraggingRef.current = false;
        setDragInProgress(false);
        lastDragUpdateRef.current = ""; // Reset drag update tracking
        console.log("✅ [DRAG] Cleared drag flags (simple view)");
      }
    }
  };

  // Filtering and sorting logic
  // Use store URLs directly - store updates trigger immediate re-renders
  const urlsToUse = useMemo(() => {
    return (list?.urls as unknown as UrlItem[]) || [];
  }, [list?.urls]);

  const filteredAndSortedUrls = useMemo(() => {
    if (!urlsToUse || urlsToUse.length === 0) return [];
    let urls: UrlItem[] = [];

    const currentSearch = search.trim();
    const normalizedCurrentSearch = currentSearch.toLowerCase();

    // Use smart search results if available
    if (currentSearch) {
      const normalizedDebouncedSearch = debouncedSearch.trim().toLowerCase();

      // Only use smartSearchResults if they match the current search query exactly
      // This prevents showing stale results from previous searches
      const resultsMatchCurrentSearch =
        smartSearchResults !== null &&
        lastSearchedQuery.toLowerCase() === normalizedCurrentSearch;

      if (resultsMatchCurrentSearch) {
        // Use AI-powered semantic search results (empty array means no matches)
        urls = smartSearchResults.map((result) => result.url);
      } else if (
        !isSearching &&
        normalizedDebouncedSearch !== normalizedCurrentSearch &&
        normalizedDebouncedSearch.length > 0 &&
        normalizedCurrentSearch.startsWith(normalizedDebouncedSearch)
      ) {
        // Only show keyword fallback if:
        // 1. Not currently searching
        // 2. Debounced search doesn't match current search (user typed more)
        // 3. Debounced search has content (not empty)
        // 4. Current search is an extension of debounced search (user is still typing)
        // This provides intermediate results while waiting for debounce
        const q = normalizedCurrentSearch;
        urls = urlsToUse.filter((u) => {
          return (
            (u.title && u.title.toLowerCase().includes(q)) ||
            (u.url && u.url.toLowerCase().includes(q)) ||
            (u.description && u.description.toLowerCase().includes(q)) ||
            u.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
            (u.category && u.category.toLowerCase().includes(q))
          );
        });
      }
      // Otherwise: isSearching is true OR debouncedSearch matches currentSearch OR
      // user deleted characters (currentSearch doesn't start with debouncedSearch)
      // In these cases, don't show keyword fallback - wait for smart search or show nothing
      // This prevents showing all URLs when smart search is about to return results
    } else {
      // No search - use all URLs (from optimistic or store)
      urls = urlsToUse;
    }

    // Favourites filter
    if (sortOption === "favourite") {
      urls = urls.filter((u) => u.isFavorite);
    }

    // Reminders filter - show URLs with reminders, sorted by reminder date (upcoming first)
    if (sortOption === "reminders") {
      urls = urls.filter((u) => u.reminder);
      urls.sort((a, b) => {
        if (!a.reminder && !b.reminder) return 0;
        if (!a.reminder) return 1;
        if (!b.reminder) return -1;
        return new Date(a.reminder).getTime() - new Date(b.reminder).getTime();
      });
    }

    // Separate pinned and unpinned URLs
    const pinnedUrls = urls.filter((u) => u.isPinned);
    const unpinnedUrls = urls.filter((u) => !u.isPinned);

    // Sorting (only applies to unpinned URLs, or all if no pins)
    if (sortOption === "latest") {
      unpinnedUrls.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      pinnedUrls.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortOption === "oldest") {
      unpinnedUrls.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      pinnedUrls.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sortOption === "az") {
      unpinnedUrls.sort((a, b) =>
        (a.title || a.url).localeCompare(b.title || b.url)
      );
      pinnedUrls.sort((a, b) =>
        (a.title || a.url).localeCompare(b.title || b.url)
      );
    } else if (sortOption === "za") {
      unpinnedUrls.sort((a, b) =>
        (b.title || b.url).localeCompare(a.title || a.url)
      );
      pinnedUrls.sort((a, b) =>
        (b.title || b.url).localeCompare(a.title || a.url)
      );
    }

    // Always show pinned URLs at the top, then unpinned
    return [...pinnedUrls, ...unpinnedUrls];
    // urlsToUse is derived from optimisticUrls and list?.urls, which are already in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    list?.urls, // Store state - all updates go through store
    sortOption,
    search,
    smartSearchResults,
    isSearching,
    lastSearchedQuery,
    debouncedSearch,
  ]);

  if (!list.id || !list.urls) return null;

  const archivedUrls = list.archivedUrls || [];
  const archivedUrlsList = showArchived ? archivedUrls : [];

  const handleRestore = async (urlId: string) => {
    const { restoreArchivedUrl } = await import("@/stores/urlListStore");
    await restoreArchivedUrl(urlId);
  };

  return (
    <div className="space-y-8">
      {/* Tabs for Active/Archived */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <Button
          type="button"
          onClick={() => setShowArchived(false)}
          className={
            !showArchived
              ? "bg-blue-600 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          }
        >
          Active URLs ({list.urls?.length || 0})
        </Button>
        <Button
          type="button"
          onClick={() => setShowArchived(true)}
          className={
            showArchived
              ? "bg-blue-600 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          }
        >
          <ArchiveBoxIcon className="h-4 w-4 mr-2" />
          Archived ({archivedUrls.length})
        </Button>
      </div>

      {/* Search and filter bar - only show for active URLs */}
      {!showArchived && (
        <div className="flex flex-col gap-2 mb-4 w-full sm:flex-row sm:items-center sm:gap-4">
          <div className="relative w-full sm:flex-grow sm:max-w-2xl">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search URLs, titles, or descriptions... (AI-powered)"
              className="w-full text-lg shadow-md font-delicious min-w-[180px] bg-transparent pr-20"
            />
            {search.trim() && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isSearching ? (
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">AI Search...</span>
                  </div>
                ) : searchCacheIndicator ? (
                  <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    Cached
                  </span>
                ) : smartSearchResults ? (
                  <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full" />
                    AI
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex flex-row flex-wrap gap-2 sm:flex-nowrap sm:gap-2">
            <Button
              type="button"
              className={
                (sortOption === "latest"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 backdrop-blur-sm border border-white/20 text-white") +
                " px-6 py-3 text-base min-w-[120px] text-center whitespace-nowrap"
              }
              onClick={() => setSortOption("latest")}
            >
              Recently Added
            </Button>
            <Button
              type="button"
              className={
                sortOption === "oldest"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 backdrop-blur-sm border border-white/20 text-white" +
                    " px-6 py-3 text-base min-w-[80px] text-center whitespace-nowrap"
              }
              onClick={() => setSortOption("oldest")}
            >
              Oldest
            </Button>
            <Button
              type="button"
              className={
                (sortOption === "az"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 backdrop-blur-sm border border-white/20 text-white") +
                " px-6 py-3 text-base min-w-[80px] text-center whitespace-nowrap"
              }
              onClick={() => setSortOption("az")}
            >
              A-Z
            </Button>
            <Button
              type="button"
              className={
                (sortOption === "za"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 backdrop-blur-sm border border-white/20 text-white") +
                " px-6 py-3 text-base min-w-[80px] text-center whitespace-nowrap"
              }
              onClick={() => setSortOption("za")}
            >
              Z-A
            </Button>
            <Button
              type="button"
              className={
                sortOption === "favourite"
                  ? "bg-yellow-400 text-white"
                  : "bg-white/10 backdrop-blur-sm border border-white/20 text-white" +
                    " px-6 py-3 text-base min-w-[80px] text-center whitespace-nowrap"
              }
              onClick={() => setSortOption("favourite")}
            >
              Favourites
            </Button>
            <Button
              type="button"
              className={
                sortOption === "reminders"
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 backdrop-blur-sm border border-white/20 text-white" +
                    " px-6 py-3 text-base min-w-[100px] text-center whitespace-nowrap"
              }
              onClick={() => setSortOption("reminders")}
            >
              🔔 Reminders
            </Button>
          </div>
        </div>
      )}

      {/* Add URL Form - only show for active URLs */}
      {!showArchived && (
        <form
          onSubmit={handleAddUrl}
          className="flex flex-col gap-4 bg-white/5 backdrop-blur-sm p-8 rounded-xl shadow-xl border border-white/20 mx-auto"
        >
          <div className="space-y-3">
            <Input
              type="url"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setEnhancementResult(null); // Reset enhancement when URL changes
              }}
              placeholder="Enter a URL to add to your list..."
              error={error}
              className="text-lg shadow-md font-delicious bg-transparent"
            />

            {/* AI Enhancement - Compact mode for inline use */}
            {newUrl && (
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <UrlEnhancer
                    url={newUrl}
                    onEnhance={(result) => {
                      setEnhancementResult(result);
                      console.log("AI Enhancement Result:", result); // Debug log

                      // Auto-fill tags if enhancement succeeded
                      if (
                        result.success &&
                        result.tags &&
                        result.tags.length > 0
                      ) {
                        const existingTags = newTags
                          .split(",")
                          .map((t) => t.trim())
                          .filter((t) => t.length > 0);
                        const allTags = [
                          ...existingTags,
                          ...result.tags,
                        ].filter(
                          (tag, index, self) => self.indexOf(tag) === index
                        );
                        setNewTags(allTags.join(", "));
                        console.log("Auto-filled tags:", allTags); // Debug log
                      }

                      // Auto-fill notes with summary if enhancement succeeded
                      // Always fill if empty, or append if not empty but different
                      if (
                        result.success &&
                        result.summary &&
                        result.summary.trim().length > 0
                      ) {
                        if (!newNote || newNote.trim().length === 0) {
                          // Only auto-fill if empty to avoid overwriting user input
                          setNewNote(result.summary);
                          console.log(
                            "Auto-filled notes with summary:",
                            result.summary
                          ); // Debug log
                        } else {
                          // If notes exist, append summary with a separator
                          setNewNote((prev) =>
                            prev.includes(result.summary)
                              ? prev
                              : `${prev}\n\nAI Summary: ${result.summary}`
                          );
                        }
                      } else {
                        console.log(
                          "No summary generated by AI or summary is empty"
                        ); // Debug log
                      }
                    }}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tags input - visible when URL is entered or enhancement provides tags */}
          {(newUrl || newTags) && (
            <Input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated) - AI will suggest some!"
              className="text-lg shadow-md font-delicious bg-transparent"
            />
          )}

          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Note (optional) - AI will suggest a summary!"
            className="text-lg shadow-md font-delicious rounded-xl min-h-[40px]"
            rows={2}
          />

          <div className="flex justify-end gap-3">
            {newUrl && (
              <Button
                type="button"
                onClick={() => {
                  setNewUrl("");
                  setNewNote("");
                  setNewTags("");
                  setEnhancementResult(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-xl transition-all duration-200"
              >
                Clear
              </Button>
            )}
            <Button
              type="submit"
              isLoading={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-2.5 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer font-delicious"
            >
              <PlusIcon className="h-5 w-5" />
              Add URL
            </Button>
          </div>
        </form>
      )}

      {/* Active URLs List */}
      {!showArchived && (
        <DragDropContext
          onDragEnd={handleDragEnd}
          onDragUpdate={(update) => {
            // Update store during drag so order is correct when drag ends
            // This ensures the drag library sees the new order immediately
            // Only works for simple view (no filtering/sorting)
            if (
              !update.destination ||
              update.destination.index === update.source.index
            ) {
              return;
            }

            // Only update for simple view (no filtering/sorting active)
            const isFilteringActive = search.trim() || sortOption !== "latest";
            if (isFilteringActive) {
              return; // Skip for filtered views - handle in onDragEnd
            }

            const current = currentList.get();
            if (!current.urls || !current.id) return;

            // Only update if destination actually changed (prevent excessive updates)
            const updateKey = `${update.source.index}-${update.destination.index}`;
            if (lastDragUpdateRef.current === updateKey) {
              return;
            }
            lastDragUpdateRef.current = updateKey;

            const currentUrls = current.urls as unknown as UrlItem[];
            const reorderedUrls = [...currentUrls];
            const [movedUrl] = reorderedUrls.splice(update.source.index, 1);
            reorderedUrls.splice(update.destination.index, 0, movedUrl);

            // Update store immediately during drag
            currentList.set({ ...current, urls: reorderedUrls });
          }}
        >
          <Droppable droppableId="url-list">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-8 ${
                  snapshot.isDraggingOver
                    ? "bg-blue-500/5 rounded-xl p-4 transition-colors"
                    : ""
                }`}
              >
                {filteredAndSortedUrls.map((url, index) => (
                  <Draggable key={url.id} draggableId={url.id} index={index}>
                    {(provided, snapshot) => (
                      <UrlCardWrapper
                        url={url}
                        provided={provided}
                        snapshot={snapshot}
                        onEdit={(urlObj) => {
                          setEditingUrl(urlObj);
                          setEditingTags(urlObj.tags?.join(", ") || "");
                          setEditingNotes(urlObj.notes || "");
                          setEditingReminder(urlObj.reminder || "");
                        }}
                        onDelete={removeUrlFromList}
                        onToggleFavorite={handleToggleFavorite}
                        onShare={handleShare}
                        onUrlClick={handleUrlClick}
                        onDuplicate={handleDuplicate}
                        onArchive={handleArchive}
                        onPin={handlePin}
                        shareTooltip={shareTooltip}
                        isMetadataReady={isMetadataReady}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Archived URLs List */}
      {showArchived && (
        <div className="space-y-8">
          {archivedUrlsList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-white/30 p-16 text-center bg-white/5 backdrop-blur-sm">
              <div className="mx-auto w-32 h-32 bg-gradient-to-br from-gray-500/20 via-gray-500/20 to-transparent rounded-full flex items-center justify-center shadow-inner border border-gray-400/30">
                <ArchiveBoxIcon className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-white">
                No Archived URLs
              </h3>
              <p className="mt-3 text-lg text-white/60 max-w-md mx-auto">
                Archived URLs will appear here. You can restore them at any
                time.
              </p>
            </div>
          ) : (
            archivedUrlsList.map((url) => (
              <div
                key={url.id}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {url.title || url.url}
                    </h3>
                    {url.url !== url.title && (
                      <p className="text-sm text-white/60 mb-2">{url.url}</p>
                    )}
                    {url.description && (
                      <p className="text-sm text-white/70 mb-2">
                        {url.description}
                      </p>
                    )}
                    {(url as UrlItem & { archivedAt?: string }).archivedAt && (
                      <p className="text-xs text-white/50 mt-2">
                        Archived:{" "}
                        {new Date(
                          (url as UrlItem & { archivedAt?: string }).archivedAt!
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleRestore(url.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    Restore
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!showArchived && list.urls.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/30 p-16 text-center bg-white/5 backdrop-blur-sm">
          <div className="mx-auto w-32 h-32 bg-gradient-to-br from-blue-500/20 via-blue-500/20 to-transparent rounded-full flex items-center justify-center shadow-inner border border-blue-400/30">
            <LinkIcon className="h-16 w-16 text-blue-400" />
          </div>
          <h3 className="mt-6 text-2xl font-semibold text-white">
            No URLs Yet
          </h3>
          <p className="mt-3 text-lg text-white/60 max-w-md mx-auto">
            Start building your collection by adding your first URL using the
            form above
          </p>
        </div>
      )}

      {editingUrl && (
        <UrlEditModal
          editingUrl={editingUrl}
          setEditingUrl={setEditingUrl}
          editingTags={editingTags}
          setEditingTags={setEditingTags}
          editingNotes={editingNotes}
          setEditingNotes={setEditingNotes}
          editingReminder={editingReminder}
          setEditingReminder={setEditingReminder}
          isEditing={isEditing}
          handleEditUrl={handleEditUrl}
        />
      )}
    </div>
  );
}
