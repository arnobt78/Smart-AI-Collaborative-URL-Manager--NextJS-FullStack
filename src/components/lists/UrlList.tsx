"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@nanostores/react";
import {
  currentList,
  addUrlToList,
  removeUrlFromList,
  updateUrlInList,
  toggleUrlFavorite,
  setDragInProgress,
  type UrlItem,
} from "@/stores/urlListStore";
import {
  updateDragOrderCache,
  syncDragOrderCacheWithServer,
  getDragOrderStorageKey,
} from "@/stores/dragOrderCache";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useUrlMetadata } from "@/hooks/useUrlMetadata";
import { useQueryClient } from "@tanstack/react-query";
import { listQueryKeys } from "@/hooks/useListQueries";
import { invalidateUrlQueries } from "@/utils/queryInvalidation";
import { fetchUrlMetadata, type UrlMetadata } from "@/utils/urlMetadata";
import { UrlCard } from "./UrlCard";
import { UrlEditModal } from "./UrlEditModal";
import { LinkIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";
import { CirclePlus } from "lucide-react";
import type { EnhancementResult } from "@/lib/ai";
import { useDebounce } from "@/hooks/useDebounce";
import type { SearchResult } from "@/lib/ai/search";
import { useToast } from "@/components/ui/Toaster";
import { useRealtimeList } from "@/hooks/useRealtimeList";
import { useListPermissions } from "@/hooks/useListPermissions";
import { UrlFilterBar } from "./UrlFilterBar";
import { UrlBulkImportExport } from "./UrlBulkImportExport";
import { UrlAddForm } from "./UrlAddForm";

// Component wrapper that fetches metadata using React Query for each URL
function UrlCardWrapper({
  url,
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
  canEdit = true, // Permission to edit URLs (false for viewers)
}: {
  url: UrlItem;
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
  canEdit?: boolean; // Permission to edit URLs (false for viewers)
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url.id });

  // CRITICAL: Transition handling to prevent bounce-back
  // When drag ends, dnd-kit uses transform to animate items
  // By controlling transition timing, we ensure smooth drag and prevent bounce-back
  const style = {
    transform: CSS.Transform.toString(transform),
    // Only allow transitions during drag (isDragging = true)
    // After drag ends (isDragging = false), transition is disabled to prevent bounce-back
    // The transform is already set to final position by dnd-kit, so no animation needed
    transition: isDragging ? transition : "none", // Use "none" instead of undefined for explicit no-transition
    opacity: isDragging ? 0.5 : 1,
  };

  const queryClient = useQueryClient();

  // For dnd-kit, listeners should go on the drag handle, not the container
  // attributes can be spread on container for accessibility
  const dragHandleListeners = listeners;
  const containerAttributes = attributes;

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

  // Reduced logging - removed excessive console logs for better debugging experience

  // Use React Query hook to fetch and cache metadata
  // Disabled until batch fetch completes to prevent duplicate calls
  const { data: metadata, isLoading: isLoadingMetadata } = useUrlMetadata(
    url.url,
    shouldFetch // Only fetch if batch is ready AND data not in cache
  );

  // Use cached data if available, otherwise use hook data
  const finalMetadata = cachedMetadata || metadata;

  return (
    <div ref={setNodeRef} style={style} {...containerAttributes}>
      <div
        className={`flex-1 transition-all duration-200 ${
          isDragging ? "dragging shadow-2xl" : ""
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
          dragHandleProps={canEdit ? dragHandleListeners : null} // Disable drag for viewers
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}

export function UrlList() {
  const list = useStore(currentList);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const permissions = useListPermissions(); // Get permissions for current list and user
  const listSlug = list?.slug; // Get slug for React Query invalidations
  const [newUrl, setNewUrl] = useState("");

  // Debug logging for list store updates to verify re-renders
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development" && list?.urls) {
      const urls = (list.urls as unknown as UrlItem[]) || [];
      const urlWithClickCount = urls.find(
        (u) => u.clickCount !== undefined && u.clickCount > 0
      );
      if (urlWithClickCount) {
      }
    }
  }, [list?.urls, list?.id]);

  // Listen for metadata refresh events to invalidate cache
  useEffect(() => {
    const handleMetadataRefresh = () => {
      // Invalidate all metadata queries to force re-fetch with improved extractor
      queryClient.invalidateQueries({
        queryKey: ["url-metadata"],
        exact: false,
      });
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

    // Listen for metadata cached events (when URL is added via unified endpoint)
    const handleMetadataCached = (event: Event) => {
      const customEvent = event as CustomEvent<{
        url: string;
        metadata: UrlMetadata;
      }>;
      const { url, metadata } = customEvent.detail;
      if (url && metadata) {
        // Populate React Query cache immediately so cards don't fetch
        const queryKey = listQueryKeys.urlMetadata(url);
        queryClient.setQueryData(queryKey, metadata);
        // console.log(
        //   `✅ [POST] Populated React Query cache for: ${url.slice(0, 40)}...`
        // );
      }
    };

    window.addEventListener("metadata-refresh-complete", handleMetadataRefresh);
    window.addEventListener("metadata-cached", handleMetadataCached);
    return () => {
      window.removeEventListener(
        "metadata-refresh-complete",
        handleMetadataRefresh
      );
      window.removeEventListener("metadata-cached", handleMetadataCached);
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
  const [isAddUrlFormExpanded, setIsAddUrlFormExpanded] = useState(false);

  // CRITICAL: Track sortable context version to force remount after drag ends
  // This ensures dnd-kit uses the updated order instead of reverting to cached positions
  const [sortableContextKey, setSortableContextKey] = useState(0);

  // REMOVED optimisticUrls state - using store directly for immediate updates

  // Configure sensors for dnd-kit (pointer for mouse/touch, keyboard for accessibility)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Real-time updates subscription
  useRealtimeList(list?.id || null);

  // CRITICAL: Clear finalDragOrderRef when URLs are added/deleted (not just reordered)
  // This prevents stale ref data from causing warnings after URL add/delete operations
  // Preserves drag operations by only clearing when URLs actually change (length or IDs)
  useEffect(() => {
    if (!list?.id || !list?.urls) {
      // List is empty or not loaded - clear ref
      if (finalDragOrderRef.current) {
        finalDragOrderRef.current = null;
      }
      return;
    }

    const currentUrls = (list.urls as unknown as UrlItem[]) || [];
    const refOrder = finalDragOrderRef.current;

    // Only clear if ref has data that doesn't match store (URLs were added/deleted)
    if (refOrder) {
      const refLength = refOrder.length;
      const storeLength = currentUrls.length;

      // Check if lengths match
      if (refLength !== storeLength) {
        // URLs were added/deleted - clear ref to prevent warnings
        // console.log("🧹 [REF] Clearing finalDragOrderRef - URLs added/deleted", {
        //   refLength,
        //   storeLength,
        //   listId: list.id,
        // });
        finalDragOrderRef.current = null;
      } else {
        // Same length - check if IDs match (might be reorder, but could be replace)
        const refIds = new Set(refOrder.map((u) => u.id));
        const storeIds = new Set(currentUrls.map((u) => u.id));
        const sameIds =
          refIds.size === storeIds.size &&
          [...refIds].every((id) => storeIds.has(id));

        if (!sameIds) {
          // Different URLs (replaced, not reordered) - clear ref
          // console.log("🧹 [REF] Clearing finalDragOrderRef - URLs replaced", {
          //   refIds: Array.from(refIds),
          //   storeIds: Array.from(storeIds),
          //   listId: list.id,
          // });
          finalDragOrderRef.current = null;
        }
        // If same IDs and same length, it's just a reorder - preserve ref (drag operation)
      }
    }
    // If ref is null, nothing to clear - this is expected after cache clear
  }, [list?.id, list?.urls]);

  // Fetch all metadata from unified API endpoint when list loads
  // This acts as a middleware/proxy layer that returns all metadata instantly
  // IMPORTANT: This must run BEFORE cards render to prevent individual API calls
  const prefetchedMetadataRef = useRef<string | null>(null);
  const batchFetchCompleteRef = useRef<string | null>(null); // Track completed batch fetches

  // CRITICAL: Compute isMetadataReady SYNCHRONOUSLY during render (not from state)
  // This prevents race condition where hooks run before useLayoutEffect
  // IMPORTANT: Use sorted unique URLs for hash to make it order-independent (pin/unpin reorder doesn't invalidate cache)
  const currentListHash =
    list?.id && list?.urls
      ? `${list.id}:${Array.from(
          new Set((list.urls as unknown as UrlItem[]).map((u) => u.url))
        )
          .sort()
          .join("|")}`
      : "";

  // Compute isMetadataReady directly from refs and cache (synchronous, no state delay)
  // IMPORTANT: Use sorted unique URLs so pin/unpin reordering doesn't reset isMetadataReady
  const isMetadataReady = useMemo(() => {
    if (!list?.id || !list?.urls || list.urls.length === 0) {
      return true; // No list = ready (nothing to fetch)
    }

    // Check if this exact list+URLs combo has been prefetched AND completed
    // Use sorted unique URLs for hash so order changes (pin/unpin) don't invalidate cache
    const urls = list.urls as unknown as UrlItem[];
    const uniqueUrls = Array.from(new Set(urls.map((u) => u.url))).sort();
    const urlsHash = uniqueUrls.join("|");
    const listId = list.id;
    const prefetchKey = `${listId}:${urlsHash}`;

    // If batch hasn't completed for this list, we're not ready
    if (batchFetchCompleteRef.current !== prefetchKey) {
      return false;
    }

    // If batch completed, check if all URLs are cached
    const allCached = uniqueUrls.every((url) => {
      const queryKey = ["url-metadata", url] as const;
      return !!queryClient.getQueryData<UrlMetadata>(queryKey);
    });

    return allCached;
  }, [list?.id, list?.urls, queryClient, currentListHash]);

  useEffect(() => {
    // CRITICAL: Skip metadata fetch if we just did a bulk import (dev server workaround)
    // Check FIRST before ANY other logic
    if (typeof window !== "undefined") {
      const skipFlag = sessionStorage.getItem("skipMetadataAfterBulkImport");
      if (skipFlag === "true") {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `⏭️ [BATCH] Skipping ALL metadata fetches after bulk import (dev server workaround)`
          );
        }
        // Keep flag set for entire session - don't clear it
        return;
      }
    }

    const current = currentList.get();
    if (!current?.id || !current?.urls || current.urls.length === 0) {
      batchFetchCompleteRef.current = null;
      return;
    }

    // Skip batch fetch if a local operation is in progress (delete, add, etc.)
    // This prevents unnecessary metadata fetches during optimistic updates
    if (isLocalOperationRef.current) {
      // console.log(
      //   `⏭️ [BATCH] Skipping batch fetch - local operation in progress`
      // );
      return;
    }

    const listId = current.id;
    const urls = current.urls as unknown as UrlItem[];
    // Use sorted unique URLs for hash so order changes (pin/unpin reorder) don't trigger re-fetch
    const uniqueUrls = Array.from(new Set(urls.map((u) => u.url))).sort();
    const urlsHash = uniqueUrls.join("|");
    const urlCount = uniqueUrls.length;
    const prefetchKey = `${listId}:${urlsHash}`;

    // CRITICAL: Check React Query cache FIRST before making any API calls
    // This ensures we skip the API call if all metadata is already cached
    // Works across page visits because React Query cache persists
    const allCached = uniqueUrls.every((url) => {
      const queryKey = listQueryKeys.urlMetadata(url);
      return !!queryClient.getQueryData<UrlMetadata>(queryKey);
    });

    if (allCached) {
      // All metadata is cached in React Query - no API call needed
      // Update refs to mark as complete
      batchFetchCompleteRef.current = prefetchKey;
      prefetchedMetadataRef.current = null;
      return; // Skip API call - use cached data
    }

    // Skip if already prefetched AND completed (for same list state)
    if (batchFetchCompleteRef.current === prefetchKey) {
      return; // Already done for this list state
    }

    // Skip if currently prefetching (wait for it to complete)
    if (prefetchedMetadataRef.current === prefetchKey) {
      return;
    }

    const fetchAllMetadata = async () => {
      // Mark as prefetching
      prefetchedMetadataRef.current = prefetchKey;

      try {
        // OPTIMIZATION: Fetch metadata in background - React Query handles caching automatically
        // With staleTime: Infinity, cached data shows instantly on subsequent visits
        // First visit: Fetches in background (non-blocking), page shows immediately
        // Subsequent visits: Uses cache instantly (no API call)
        // After invalidation: Refetches once, then cached again
        const response = await fetch(`/api/lists/${listId}/metadata`);

        if (response.ok) {
          const { metadata, cached } = await response.json();
          const metadataCount = Object.keys(metadata).length;

          // Only log significant events (cache misses, errors)
          if (!cached) {
            // console.log(
            //   `🔄 [BATCH] Fetched ${metadataCount} metadata entries from web (${fetchTime.toFixed(
            //     2
            //   )}ms)`
            // );
          }

          // Hydrate React Query cache and localStorage with all metadata instantly
          // CRITICAL: This happens synchronously, so cards will see cache immediately
          // Also prefetch images so they display instantly (no loading state on reorder)
          let hydratedCount = 0;
          Object.entries(metadata).forEach(([url, metaData]) => {
            const queryKey = listQueryKeys.urlMetadata(url);
            const meta = metaData as UrlMetadata;

            // Check if already in cache
            const existingCache =
              queryClient.getQueryData<UrlMetadata>(queryKey);
            if (!existingCache) {
              // Set in React Query cache (instant, synchronous)
              queryClient.setQueryData(queryKey, meta);
              hydratedCount++;
            }

            // Prefetch image if available (ensures instant display on reorder)
            if (meta.image && typeof window !== "undefined") {
              try {
                // Mark image as prefetched in global cache (prevents loading state on re-render)
                const imageCacheKey = `image-loaded:${meta.image}`;
                const imageAlreadyLoaded =
                  sessionStorage.getItem(imageCacheKey);

                // Prefetch image using Image() constructor to warm browser cache
                // Don't use link preload to avoid crossorigin warnings
                if (!imageAlreadyLoaded && meta.image) {
                  // Store image URL in const for use in closures
                  const imageUrl = meta.image;
                  const img = new window.Image();

                  // Try anonymous first (for CORS images), fall back to regular load
                  img.crossOrigin = "anonymous";
                  img.src = imageUrl;

                  // Mark as prefetched after successful load
                  img.onload = () => {
                    sessionStorage.setItem(imageCacheKey, "true");
                  };

                  // If CORS fails, try without crossOrigin (for same-origin images)
                  img.onerror = () => {
                    try {
                      const img2 = new window.Image();
                      img2.src = imageUrl;
                      img2.onload = () => {
                        sessionStorage.setItem(imageCacheKey, "true");
                      };
                      img2.onerror = () => {
                        // Silently fail - image will load normally in component
                      };
                    } catch {
                      // Silently fail - image will load normally in component
                    }
                  };
                }
              } catch (error) {
                // Ignore prefetch errors (non-critical)
                // console.warn(
                //   `  ⚠️ [BATCH] Failed to prefetch image for ${url}:`,
                //   error
                // );
              }
            }

            // Also save to localStorage for persistence
            try {
              const key = `react-query:${queryKey.join(":")}`;
              localStorage.setItem(
                key,
                JSON.stringify({
                  data: meta,
                  timestamp: Date.now(),
                })
              );
            } catch {
              // Ignore localStorage errors
            }
          });

          // CRITICAL: Mark batch as complete AFTER cache hydration
          // This makes isMetadataReady=true on next render (computed synchronously)
          batchFetchCompleteRef.current = prefetchKey;

          // Force a React Query cache update notification to trigger re-renders
          // This ensures cards see the newly hydrated cache immediately
          queryClient.invalidateQueries({
            queryKey: ["url-metadata"],
            exact: false,
            refetchType: "none",
          });
        } else {
          // console.error(
          //   `❌ [BATCH] API error: ${response.status} ${response.statusText}`
          // );
          prefetchedMetadataRef.current = null; // Reset on error
        }
      } catch (error) {
        // console.error(`❌ [BATCH] Failed to fetch batch metadata:`, error);
        prefetchedMetadataRef.current = null; // Reset on error

        // Fallback to individual prefetching if batch endpoint fails
        const uniqueUrls = Array.from(new Set(urls.map((u) => u.url)));

        // Load from localStorage first (instant)
        uniqueUrls.forEach((url) => {
          const queryKey = listQueryKeys.urlMetadata(url);
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
          const queryKey = listQueryKeys.urlMetadata(url);
          return !queryClient.getQueryData(queryKey);
        });

        // Fetch in batches
        const concurrency = 5;
        for (let i = 0; i < urlsToFetch.length; i += concurrency) {
          const batch = urlsToFetch.slice(i, i + concurrency);
          await Promise.allSettled(
            batch.map((url) =>
              queryClient
                .prefetchQuery({
                  queryKey: ["url-metadata", url] as const,
                  queryFn: () => fetchUrlMetadata(url),
                  // CRITICAL: Use Infinity for consistency with useUrlMetadata hook
                  staleTime: Infinity, // Cache forever until invalidated
                })
                .catch(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?.id, list?.urls, queryClient]);

  // Track if we're currently performing a local operation to prevent refresh loops
  const isLocalOperationRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);
  const lastDragEndTimeRef = useRef<number>(0); // Track when drag ended
  const lastDragUpdateRef = useRef<string>(""); // Track last drag update to prevent excessive updates
  const lastDeleteTimeRef = useRef<number>(0); // Track when delete happened to prevent real-time refresh
  const finalDragOrderRef = useRef<UrlItem[] | null>(null); // CRITICAL: Preserve final drag order across re-renders
  const localStorageCleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track localStorage cleanup timeout to clear previous ones

  // Use centralized drag order cache management (imported from dragOrderCache)
  // This ensures consistency across all operations (add/delete/drag/HMR/SSE)

  // CRITICAL: Restore drag order from localStorage SYNCHRONOUSLY before first render
  // useLayoutEffect runs BEFORE browser paint, so drag library sees correct order immediately
  // Using localStorage instead of sessionStorage because Fast Refresh clears sessionStorage
  useLayoutEffect(() => {
    if (list?.id && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(getDragOrderStorageKey(list.id));
        if (stored) {
          const parsed = JSON.parse(stored) as UrlItem[];
          const currentUrls = (list.urls as unknown as UrlItem[]) || [];

          // Only restore if same URLs (just reordered)
          if (parsed.length === currentUrls.length) {
            const storedIds = new Set(parsed.map((u) => u.id));
            const currentIds = new Set(currentUrls.map((u) => u.id));
            const sameIds =
              storedIds.size === currentIds.size &&
              [...storedIds].every((id) => currentIds.has(id));

            if (sameIds) {
              // Check if order actually differs
              const storedOrder = parsed.map((u) => u.id).join(",");
              const currentOrder = currentUrls.map((u) => u.id).join(",");

              if (storedOrder !== currentOrder) {
                finalDragOrderRef.current = parsed;
                // CRITICAL: Apply restored order to store - use queueMicrotask to avoid flushSync in lifecycle
                // This ensures drag library sees correct order without React warnings
                queueMicrotask(() => {
                  currentList.set({ ...list, urls: parsed });
                });
              }
            }
          }
        }
      } catch {
        // Ignore sessionStorage errors
      }
    }
  }, [list?.id, list?.urls]); // Run when list ID OR URLs change (catches Fast Refresh)

  // Listen for real-time update events (debounced to prevent loops)
  useEffect(() => {
    const handleListUpdate = async (event: Event) => {
      // Skip refresh if we're performing a local operation or dragging (avoid loop/interference)
      if (isLocalOperationRef.current || isDraggingRef.current) {
        // console.log(
        //   "⏭️ [REALTIME] Skipping refresh - local operation or drag in progress"
        // );
        return;
      }

      const now = Date.now();

      // Get current list early (needed for multiple checks)
      const current = currentList.get();

      // CRITICAL: Prevent refreshing if we just completed a drag operation (protect optimistic state)
      // Increased to 30 seconds to survive queued refreshes and Fast Refresh cycles
      // This is especially important because real-time updates can queue refreshes that run later
      if (now - lastDragEndTimeRef.current < 30000) {
        const dragEndTime = now - lastDragEndTimeRef.current;
        // console.log(
        //   `⏭️ [REALTIME] Skipping refresh - drag operation just completed (${dragEndTime.toFixed(
        //     0
        //   )}ms ago, protecting optimistic state)`
        // );

        // CRITICAL: Clear any queued refreshes to prevent them from running later
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
        return;
      }

      // CRITICAL: Also check if we have a preserved drag order in localStorage
      // If we do, don't let real-time updates overwrite it
      // Using localStorage instead of sessionStorage because Fast Refresh clears sessionStorage
      if (current?.id && typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(
            getDragOrderStorageKey(current.id)
          );
          if (stored) {
            const parsed = JSON.parse(stored) as UrlItem[];
            const currentUrls = (current.urls as unknown as UrlItem[]) || [];
            if (parsed.length === currentUrls.length) {
              const storedIds = new Set(parsed.map((u) => u.id));
              const currentIds = new Set(currentUrls.map((u) => u.id));
              const sameIds =
                storedIds.size === currentIds.size &&
                [...storedIds].every((id) => currentIds.has(id));
              if (sameIds) {
                const storedOrder = parsed.map((u) => u.id).join(",");
                const currentOrder = currentUrls.map((u) => u.id).join(",");
                if (storedOrder !== currentOrder) {
                  // console.log(
                  //   `⏭️ [REALTIME] Skipping refresh - drag order preserved in localStorage`,
                  //   { stored: storedOrder, current: currentOrder }
                  // );
                  return;
                }
              }
            }
          }
        } catch (err) {
          // console.error("❌ [REALTIME] Error checking localStorage", err);
        }
      }

      // Only proceed if no drag order is preserved
      // console.log("🔄 [REALTIME] Proceeding with refresh", {
      //   currentOrder: (current.urls as unknown as UrlItem[]).map(
      //     (u: UrlItem) => u.id
      //   ),
      // });

      // Prevent refreshing if we just deleted a URL (protect optimistic state)
      // Real-time events from our own delete operation should be ignored
      if (now - lastDeleteTimeRef.current < 5000) {
        // console.log(
        //   "⏭️ [REALTIME] Skipping refresh - delete operation just completed (protecting optimistic state)"
        // );
        return;
      }

      const customEvent = event as CustomEvent<{
        listId: string;
        timestamp?: string;
        action?: string;
      }>;

      // Only refresh if this is the current list
      if (current?.id === customEvent.detail.listId && current?.slug) {
        // Skip collaborator_added and collaborator_removed - these are handled optimistically
        // BUT allow collaborator_role_updated to trigger refresh (affects current user's permissions)
        const isCollaboratorActionToSkip =
          customEvent.detail.action === "collaborator_added" ||
          customEvent.detail.action === "collaborator_removed";

        if (isCollaboratorActionToSkip) {
          // console.log(
          //   "⏭️ [REALTIME] Skipping refresh - collaborator action (handled optimistically)"
          // );
          return; // Skip refetch for collaborator add/remove changes
        }

        // For collaborator_role_updated, we need to refresh to update permissions
        // This is critical for the collaborator whose role changed to see updated UI
        if (customEvent.detail.action === "collaborator_role_updated") {
          // Role updated - refreshing list to update permissions
          // Continue to handle the refresh below
        }

        // Check if this is a metadata change (like visibility toggle or role updates) - these need immediate updates
        const isMetadataChange =
          customEvent.detail.action === "list_made_public" ||
          customEvent.detail.action === "list_made_private" ||
          customEvent.detail.action === "list_updated" ||
          customEvent.detail.action === "collaborator_role_updated";

        // For metadata changes, use shorter throttle or force refresh
        const throttleWindow = isMetadataChange ? 2000 : 5000; // 2s for metadata, 5s for others

        // If we're within throttle window, queue the refresh for after throttle expires
        const timeSinceLastRefresh = now - lastRefreshRef.current;
        if (timeSinceLastRefresh < throttleWindow) {
          const remainingTime = throttleWindow - timeSinceLastRefresh;
          // console.log(
          //   `⏭️ [REALTIME] Throttling refresh (${remainingTime}ms remaining), queuing for later...`
          // );

          // Clear any existing queued refresh
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }

          // Queue refresh to happen after throttle expires
          refreshTimeoutRef.current = setTimeout(() => {
            const now = Date.now();
            // CRITICAL: Check drag end time here too - queued refreshes must respect drag protection
            if (
              !isLocalOperationRef.current &&
              !isDraggingRef.current &&
              now - lastDragEndTimeRef.current >= 30000 && // Match the protection window
              now - lastDeleteTimeRef.current >= 5000 &&
              current.slug
            ) {
              lastRefreshRef.current = now;
              // Use React Query invalidation instead of getList() - triggers unified endpoint refetch
              queryClient.invalidateQueries({
                queryKey: listQueryKeys.unified(current.slug),
              });
            }
          }, remainingTime + 100); // Add 100ms buffer
          return;
        }

        // Clear any pending refresh
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }

        // Skip getList during bulk imports to prevent overwhelming the browser/server
        if (
          typeof window !== "undefined" &&
          (window as any).__bulkImportActive
        ) {
          if (process.env.NODE_ENV === "development") {
            console.debug(
              "⏭️ [URL_LIST] Skipping getList - bulk import in progress"
            );
          }
          return;
        }

        // For metadata changes, refresh immediately (no debounce)
        if (isMetadataChange) {
          lastRefreshRef.current = now;
          // Use React Query invalidation instead of getList() - triggers unified endpoint refetch
          queryClient.invalidateQueries({
            queryKey: listQueryKeys.unified(current.slug),
          });
          return;
        }

        // For other changes, debounce to batch rapid updates
        refreshTimeoutRef.current = setTimeout(async () => {
          const now = Date.now();
          // Skip if bulk import started during the delay
          if (
            typeof window !== "undefined" &&
            (window as any).__bulkImportActive
          ) {
            if (process.env.NODE_ENV === "development") {
              // Skipping queued getList - bulk import in progress
            }
            return;
          }
          // CRITICAL: Check drag end time here too - queued refreshes must respect drag protection
          if (
            !isLocalOperationRef.current &&
            !isDraggingRef.current &&
            now - lastDragEndTimeRef.current >= 30000 && // Match the protection window (30 seconds)
            now - lastDeleteTimeRef.current >= 5000 &&
            current.slug
          ) {
            lastRefreshRef.current = now;
            // Use React Query invalidation instead of getList() - triggers unified endpoint refetch
            queryClient.invalidateQueries({
              queryKey: listQueryKeys.unified(current.slug),
            });
          }
        }, 1000); // 1 second delay to batch multiple rapid updates
      }
    };

    // Listen for unified-update events (from SSE/real-time updates)
    // OPTIMIZATION: Unified-update events are dispatched AFTER server updates complete
    // The event means data is already updated - we don't need to fetch again
    // ListPage handles initial fetch on mount, and SSE syncs changes automatically
    // Only handle specific actions that need UI updates (like clearing drag cache)
    const handleUnifiedUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        action?: string;
        timestamp?: string;
      }>;

      const current = currentList.get();
      if (!current?.id) {
        return;
      }

      // Only handle if it's for this list
      if (
        customEvent.detail?.listId &&
        customEvent.detail.listId !== current.id
      ) {
        return;
      }

      // Skip collaborator actions (handled optimistically)
      const isCollaboratorActionToSkip =
        customEvent.detail?.action === "collaborator_added" ||
        customEvent.detail?.action === "collaborator_removed";

      if (isCollaboratorActionToSkip) {
        return;
      }

      const action = customEvent.detail?.action || "unknown";

      // CRITICAL: If this is a reorder action, clear local drag order cache on remote screens
      // This ensures we use the server's order instead of any stale local cache
      if (action === "url_reordered") {
        finalDragOrderRef.current = null;
        // Also clear localStorage cache to ensure fresh order from server
        if (current.id && typeof window !== "undefined") {
          try {
            localStorage.removeItem(getDragOrderStorageKey(current.id));
          } catch (err) {
            // Failed to clear localStorage cache
          }
        }
        // Force re-render to show updated order
        setSortableContextKey((prev) => prev + 1);
      }

      // Note: Unified-update events are dispatched AFTER server updates (data is already fresh on server)
      // ListPage handles unified fetch on mount and will refetch when needed via React Query
      // The store will be updated by ListPage's unified query or via other mechanisms
    };

    window.addEventListener("list-updated", handleListUpdate);
    window.addEventListener("unified-update", handleUnifiedUpdate);
    return () => {
      window.removeEventListener("list-updated", handleListUpdate);
      window.removeEventListener("unified-update", handleUnifiedUpdate);
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
        // console.error("Smart search failed:", error);
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

    if (!current.id || !current.urls) {
      return;
    }

    const currentUrls = current.urls as unknown as UrlItem[];
    const urlToUpdate = currentUrls.find((u) => u.id === urlId);

    if (!urlToUpdate) {
      return;
    }

    const oldClickCount = urlToUpdate.clickCount || 0;

    // Update click count optimistically FIRST - immediate UI feedback
    const newClickCount = oldClickCount + 1;

    // Create a new array with completely new object references to ensure React re-renders
    const updatedUrls = currentUrls.map(
      (u) =>
        u.id === urlId
          ? { ...u, clickCount: newClickCount } // Create new object with updated clickCount
          : { ...u } // Create new object for all URLs to ensure React detects the change
    );

    // Update store immediately for instant feedback with new object references
    flushSync(() => {
      currentList.set({ ...current, urls: updatedUrls });
    });
    try {
      const response = await fetch(
        `/api/lists/${current.id}/urls/${urlId}/click`,
        {
          method: "POST",
          credentials: "include", // Ensure cookies are sent for authentication
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === "development") {
          console.log(
            `✅ [API] POST /api/lists/${current.id}/urls/${urlId}/click - success`
          );
        }

        // Update with server response to ensure accuracy
        if (data.list) {
          const serverUrls = (data.list.urls as unknown as UrlItem[]) || [];
          const serverUrlMap = new Map(
            serverUrls.map((u: UrlItem) => [u.id, u])
          );

          // Create completely new URLs array ensuring server clickCount is used
          const finalUrls = updatedUrls.map((url) => {
            const serverUrl = serverUrlMap.get(url.id);
            // CRITICAL: Always create new object reference, use server clickCount if available
            if (serverUrl) {
              return {
                ...url,
                clickCount: serverUrl.clickCount ?? url.clickCount,
              };
            }
            return { ...url }; // Create new reference even if no server update
          });

          // Get current list state to preserve all fields
          const currentListState = currentList.get();

          // Create completely new list object with new array references
          // Adding updatedAt timestamp ensures nanostores detects the change
          const updatedListData = {
            ...currentListState, // Preserve existing fields
            ...data.list, // Override with server data
            urls: finalUrls.map((u) => ({ ...u })), // Create completely new object references
            updatedAt: new Date().toISOString(), // Timestamp to force change detection
          };

          // Use flushSync to ensure store update triggers immediate re-render
          flushSync(() => {
            currentList.set(updatedListData);
          });
        }
      } else {
        // If server call failed, keep optimistic update
        await response.json().catch(() => ({}));
        // Keep optimistic update even if server call fails - better UX
      }
    } catch (error) {
      // Network error or other issue - keep optimistic update
      // Keep optimistic update for better UX even if network fails
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

    // Notify activity feed to skip fetch after local operation
    window.dispatchEvent(new CustomEvent("local-operation"));

    try {
      const url = new URL(newUrl);

      // Check if we already have metadata in React Query cache (from AI enhancement)
      const queryKey = ["url-metadata", url.toString()] as const;
      const existingMetadata = queryClient.getQueryData<UrlMetadata>(queryKey);

      // Use enhanced tags if available, otherwise use manually entered tags
      const tagsToUse = newTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Pass existing metadata if available (from AI enhancement)
      // The unified POST endpoint will use it if provided, otherwise fetch it
      // This prevents duplicate metadata fetches
      await addUrlToList(
        url.toString(),
        existingMetadata?.title, // Use cached metadata title if available
        tagsToUse.length > 0 ? tagsToUse : undefined,
        newNote || enhancementResult?.summary || "",
        undefined, // reminder
        enhancementResult?.category, // AI-generated category
        existingMetadata // Pass cached metadata to avoid re-fetching
      );
      // Note: Metadata is now fetched and cached by the unified POST endpoint
      // The event listener in UrlList will populate React Query cache when metadata-cached event fires

      setNewUrl("");
      setNewNote("");
      setNewTags("");
      setEnhancementResult(null);
      setIsAddUrlFormExpanded(false); // Collapse form after successful add
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

      // Check if we have metadata in React Query cache (from prefetch while typing)
      // This prevents redundant metadata fetch in PATCH endpoint
      let existingMetadata: UrlMetadata | undefined;
      if (urlChanged && url) {
        try {
          const queryKey = listQueryKeys.urlMetadata(url);
          existingMetadata = queryClient.getQueryData<UrlMetadata>(queryKey);
          if (existingMetadata) {
            // console.log(
            //   `✅ [EDIT] Found cached metadata from prefetch for: ${url.slice(
            //     0,
            //     40
            //   )}...`
            // );
          }
        } catch {
          // Ignore cache check errors
        }
      }

      // Prepare updates
      const updates: Partial<UrlItem> = { title, url };
      if (tags !== undefined) updates.tags = tags;
      if (notes !== undefined) updates.notes = notes;
      if (reminder !== undefined) updates.reminder = reminder;

      // updateUrlInList handles optimistic updates internally
      // It will update the store immediately and sync with server
      // It also populates React Query cache synchronously with metadata from PATCH response
      // if URL changed, so no need to manually fetch here
      // Pass existingMetadata to avoid redundant fetch in PATCH endpoint
      await updateUrlInList(id, updates, undefined, existingMetadata);

      // Clean up old cache entry if URL changed (PATCH already populated new one)
      if (urlChanged && currentUrl) {
        queryClient.removeQueries({
          queryKey: listQueryKeys.urlMetadata(currentUrl.url),
        });
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

    // Notify activity feed to skip fetch after local operation
    window.dispatchEvent(new CustomEvent("local-operation"));

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

    // Note: Activity feed will update via activity-added event from updateUrlInList
    // No need to dispatch activity-updated here - that would trigger redundant fetch

    try {
      // Use updateUrlInList which will sync with server
      await updateUrlInList(id, { isFavorite: updatedUrl.isFavorite });

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // Store function already dispatches activity-added event, but we need to invalidate cache
      if (current.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }
    } catch (err) {
      // console.error("Failed to toggle favorite:", err);
      // Revert on error - use React Query invalidation to trigger unified endpoint refetch
      if (current.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
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

    // Notify activity feed to skip fetch after local operation
    window.dispatchEvent(new CustomEvent("local-operation"));

    const current = currentList.get();
    if (!current.urls || !current.id) return;

    // Get URL title for toast
    const urlTitle = urlToDuplicate.title || urlToDuplicate.url || "URL";

    try {
      // Check if we have metadata in React Query cache for the URL being duplicated
      // This prevents redundant metadata fetch in POST endpoint
      let existingMetadata: UrlMetadata | undefined;
      if (urlToDuplicate.url) {
        try {
          const queryKey = ["url-metadata", urlToDuplicate.url] as const;
          existingMetadata = queryClient.getQueryData<UrlMetadata>(queryKey);
          if (existingMetadata) {
            // console.log(
            //   `✅ [DUPLICATE] Found cached metadata from React Query for: ${urlToDuplicate.url.slice(
            //     0,
            //     40
            //   )}...`
            // );
          }
        } catch {
          // Ignore cache check errors
        }
      }

      // Use unified POST endpoint via addUrlToList with isDuplicate flag
      // This handles duplicate, metadata fetching, activity, and real-time updates
      await addUrlToList(
        urlToDuplicate.url,
        urlToDuplicate.title,
        urlToDuplicate.tags || [],
        urlToDuplicate.notes || "",
        urlToDuplicate.reminder,
        urlToDuplicate.category,
        existingMetadata, // Pass cached metadata if available
        true // isDuplicate flag - creates url_duplicated activity instead of url_added
      );

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // Store function already dispatches activity-added event, but we need to invalidate cache
      if (current.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }

      // Show success toast
      toast({
        title: "URL Duplicated",
        description: `"${urlTitle}" has been duplicated and added to the list.`,
        variant: "success",
      });
    } catch (err) {
      // console.error("Failed to duplicate URL:", err);
      // Revert on error - use React Query invalidation to trigger unified endpoint refetch
      if (current.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }
      // Show error toast
      toast({
        title: "Duplicate Failed",
        description:
          err instanceof Error ? err.message : "Failed to duplicate URL",
        variant: "error",
      });
    } finally {
      // Clear the flag after a delay
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 1000);
    }
  };

  const handleArchive = async (id: string) => {
    // Set flag for archive operation
    isLocalOperationRef.current = true;

    // Notify activity feed to skip fetch after local operation
    window.dispatchEvent(new CustomEvent("local-operation"));

    const current = currentList.get();
    if (!current.urls || !current.id) return;

    // Get URL details for toast
    const currentUrls = current.urls as unknown as UrlItem[];
    const urlToArchive = currentUrls.find((u) => u.id === id);
    const urlTitle = urlToArchive?.title || urlToArchive?.url || "URL";

    try {
      const { archiveUrlFromList } = await import("@/stores/urlListStore");
      await archiveUrlFromList(id);

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // Store function already dispatches activity-added event, but we need to invalidate cache
      if (current.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }

      // Show success toast
      toast({
        title: "URL Archived",
        description: `"${urlTitle}" has been archived and removed from the list.`,
        variant: "success",
      });
    } catch (err) {
      // console.error("Failed to archive URL:", err);
      // Revert on error - use React Query invalidation to trigger unified endpoint refetch
      if (current?.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }
      // Show error toast
      toast({
        title: "Archive Failed",
        description:
          err instanceof Error ? err.message : "Failed to archive URL",
        variant: "error",
      });
    } finally {
      // Clear the flag after a delay
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 1000);
    }
  };

  const handlePin = async (id: string) => {
    // Set flag for pin operation
    isLocalOperationRef.current = true;

    // Notify activity feed to skip fetch after local operation
    window.dispatchEvent(new CustomEvent("local-operation"));

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

    // Note: Activity feed will update via activity-added event from updateUrlInList
    // No need to dispatch activity-updated here - that would trigger redundant fetch

    try {
      // Use unified PATCH endpoint which handles pin/unpin and returns activity data
      await updateUrlInList(id, { isPinned: updatedUrl.isPinned });

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // Store function already dispatches activity-added event, but we need to invalidate cache
      if (current.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }
    } catch (err) {
      // console.error("Failed to pin URL:", err);
      // Revert on error - use React Query invalidation to trigger unified endpoint refetch
      if (current.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
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
        // console.error("Error sharing:", err);
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
        // Error copying to clipboard
        setShareTooltip("Failed to copy URL");
        setTimeout(() => setShareTooltip(null), 2000);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      // Clear flags immediately if no destination or same position
      isDraggingRef.current = false;
      setDragInProgress(false);
      return;
    }

    // Prevent multiple simultaneous drag operations
    if (isDraggingRef.current) {
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

    // Notify activity feed to skip fetch after local operation
    window.dispatchEvent(new CustomEvent("local-operation"));

    // If filtering/sorting is active, disable drag-and-drop for now
    // Or we can work with visible items only
    const isFilteringActive = search.trim() || sortOption !== "latest";

    if (isFilteringActive) {
      // For filtered/sorted views, reorder based on visible items only
      const visibleIds = filteredAndSortedUrls.map((u) => u.id);
      const oldIndex = visibleIds.indexOf(active.id as string);
      const newIndex = visibleIds.indexOf(over.id as string);

      if (oldIndex === -1 || newIndex === -1) {
        isDraggingRef.current = false;
        setDragInProgress(false);
        return;
      }

      const reorderedVisible = arrayMove(visibleIds, oldIndex, newIndex);

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
        flushSync(() => {
          currentList.set({ ...current, urls: reorderedUrls });
        });
      }

      // CRITICAL: Store final drag order in ref AND localStorage to survive Fast Refresh
      // This ensures the card stays in position even if component remounts
      finalDragOrderRef.current = [...reorderedUrls];

      // CRITICAL: Also store in localStorage during drag (survives Fast Refresh)
      // Using localStorage instead of sessionStorage because Fast Refresh clears sessionStorage
      // This ensures order is preserved even if Fast Refresh happens mid-drag
      if (current.id && typeof window !== "undefined") {
        try {
          const storageKey = getDragOrderStorageKey(current.id);
          const storageValue = JSON.stringify(reorderedUrls);
          localStorage.setItem(storageKey, storageValue);
        } catch (err) {
          // Ignore localStorage errors
        }
      }

      // Use unified PATCH endpoint for reorder (same pattern as other URL actions)
      // CRITICAL: Always use the preserved order from ref, not from store after API response

      try {
        if (process.env.NODE_ENV === "development") {
          console.log(`🔄 [API] PATCH /api/lists/${current.id}/urls - reorder`);
        }
        const response = await fetch(`/api/lists/${current.id}/urls`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: finalDragOrderRef.current, // Use preserved order from ref
            action: "reorder",
          }),
        });
        if (response.ok) {
          const { list, activity: activityData } = await response.json();

          // CRITICAL: Always use the preserved order from ref (survives re-renders)
          // Get the preserved order BEFORE checking anything else
          const preservedOrder = finalDragOrderRef.current;
          if (!preservedOrder) {
            // Fallback: if ref is cleared (shouldn't happen), use server order
            currentList.set(list);
            return;
          }

          // ALWAYS preserve the drag order in the store (card stays in position)
          // Merge server response (for other fields) with preserved order
          const mergedList = {
            ...list,
            urls: preservedOrder, // Always use preserved order (prevents card jumping)
          };

          // CRITICAL: Update store AND increment key in same flushSync cycle
          // This ensures SortableContext remounts immediately with the NEW items array
          // Without flushSync, the component might re-render with old order, causing bounce-back
          // The key increment forces SortableContext to remount with new items array
          flushSync(() => {
            currentList.set(mergedList);
            // Force immediate re-render by incrementing key in same flushSync
            // This ensures SortableContext sees the new order immediately before any other render
            setSortableContextKey((prev) => prev + 1);
          });

          // NOTE: The order is now preserved in both store AND ref
          // The ref ensures urlsToUse memo uses preserved order
          // The store ensures other parts of the app see the updated order
          // The key increment forces SortableContext to remount with new items

          // Dispatch activity-added event for optimistic feed update (no redundant fetch)
          if (activityData) {
            window.dispatchEvent(
              new CustomEvent("activity-added", {
                detail: {
                  listId: current.id,
                  activity: {
                    id: activityData.id,
                    action: activityData.action,
                    details: activityData.details,
                    createdAt: activityData.createdAt,
                    user: activityData.user,
                  },
                },
              })
            );
          }

          // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 API call
          // This ensures activity feed updates immediately after reorder (same pattern as other URL actions)
          if (current.slug && current.id) {
            invalidateUrlQueries(queryClient, current.slug, current.id, false);
          }

          // DON'T clear localStorage immediately - keep it much longer to survive Fast Refresh
          // Fast Refresh can happen multiple times during development, so we need a longer window
          // Clear ref after a shorter time, but keep localStorage for 60 seconds
          setTimeout(() => {
            finalDragOrderRef.current = null;
          }, 5000); // Clear ref after 5 seconds

          // Keep localStorage for 60 seconds to survive multiple Fast Refresh cycles
          // This is critical because Fast Refresh can happen during/after drag operations
          // Clear previous cleanup timeout to avoid multiple cleanup messages
          if (localStorageCleanupTimeoutRef.current) {
            clearTimeout(localStorageCleanupTimeoutRef.current);
          }
          localStorageCleanupTimeoutRef.current = setTimeout(() => {
            localStorageCleanupTimeoutRef.current = null;
            if (current.id && typeof window !== "undefined") {
              try {
                const storageKey = getDragOrderStorageKey(current.id);
                localStorage.removeItem(storageKey);
                // Also clear global cache
                const globalCache = (window as any).__dragOrderCache;
                if (globalCache) {
                  delete globalCache[storageKey];
                }
              } catch {
                // Ignore localStorage errors
              }
            }
          }, 60000); // Keep for 60 seconds to survive Fast Refresh cycles
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            `❌ [API] PATCH /api/lists/${current.id}/urls - reorder failed:`,
            err
          );
        }
        // Revert on error - fetch the current list
        finalDragOrderRef.current = null; // Clear ref on error
        // Clear localStorage on error (using localStorage instead of sessionStorage)
        if (current.id && typeof window !== "undefined") {
          try {
            localStorage.removeItem(getDragOrderStorageKey(current.id));
          } catch {
            // Ignore localStorage errors
          }
        }
        const currentSlug = currentList.get().slug;
        if (currentSlug) {
          // Use React Query invalidation instead of getList() - triggers unified endpoint refetch
          queryClient.invalidateQueries({
            queryKey: listQueryKeys.unified(currentSlug),
          });
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
      }
    } else {
      // Simple reorder when no filtering/sorting
      const currentUrls = current.urls as unknown as UrlItem[];
      const oldIndex = currentUrls.findIndex((u) => u.id === active.id);
      const newIndex = currentUrls.findIndex((u) => u.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        isDraggingRef.current = false;
        setDragInProgress(false);
        return;
      }

      // Use position-based system - much simpler than array reordering!
      // Assign position based on new index
      const reorderedUrls = currentUrls.map((url, idx) => {
        if (url.id === active.id) {
          // Moved item gets new position
          return { ...url, position: newIndex };
        }
        // Other items: adjust positions if needed
        const currentPos = url.position ?? idx;
        if (oldIndex < newIndex) {
          // Moving down: items between old and new shift up
          if (currentPos > oldIndex && currentPos <= newIndex) {
            return { ...url, position: currentPos - 1 };
          }
        } else {
          // Moving up: items between new and old shift down
          if (currentPos >= newIndex && currentPos < oldIndex) {
            return { ...url, position: currentPos + 1 };
          }
        }
        return url;
      });

      // Sort by position for consistent order
      reorderedUrls.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

      // CRITICAL: Store final drag order in ref AND localStorage to survive Fast Refresh
      // This ensures the card stays in position even if component remounts
      finalDragOrderRef.current = [...reorderedUrls];

      // CRITICAL: Store in cache IMMEDIATELY using centralized cache management
      // This handles both localStorage and global cache, with validation
      // Using centralized functions ensures consistency across all operations
      if (current.id && typeof window !== "undefined") {
        try {
          // Update cache with new drag order (centralized function handles both localStorage and global cache)
          const updated = updateDragOrderCache(
            current.id,
            reorderedUrls,
            false
          );

          // Cache updated successfully
        } catch (err) {
          // Ignore cache errors
        }
      }

      // Optimistically update the UI immediately - this is critical for UX
      // Use a synchronous update to ensure React sees it immediately

      // CRITICAL: Update store AND increment key in same flushSync cycle
      // This ensures SortableContext remounts immediately with the NEW items array
      // Without flushSync, the component might re-render with old order, causing bounce-back
      flushSync(() => {
        currentList.set({ ...current, urls: reorderedUrls });
        // Force immediate re-render by incrementing key in same flushSync
        // This ensures SortableContext sees the new order immediately before any other render
        setSortableContextKey((prev) => prev + 1);
      });

      // NOTE: The order is now preserved in both store AND ref
      // The ref ensures urlsToUse memo uses preserved order during drag
      // The store ensures the final order is persisted after drag completes

      if (process.env.NODE_ENV === "development") {
        console.log(
          "✅ [DRAG] Store updated, sortableContextKey will increment on next render",
          currentList.get().urls?.map((u: UrlItem) => u.id)
        );
      }

      // Use unified PATCH endpoint for reorder (same pattern as other URL actions)
      // CRITICAL: Always use the preserved order from ref, not from store after API response

      // CRITICAL: Log what we're sending to the API
      const urlsToSend = finalDragOrderRef.current;
      const orderToSend = urlsToSend?.map((u) => u.id).join(",") || "NULL";
      try {
        if (process.env.NODE_ENV === "development") {
          console.log(`🔄 [API] PATCH /api/lists/${current.id}/urls - reorder`);
        }
        const response = await fetch(`/api/lists/${current.id}/urls`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: urlsToSend, // Use preserved order from ref
            action: "reorder",
          }),
        });
        if (response.ok) {
          const { list, activity: activityData } = await response.json();
          if (process.env.NODE_ENV === "development") {
            console.log(
              `✅ [API] PATCH /api/lists/${current.id}/urls - reorder success`
            );
          }

          // CRITICAL: Always use the preserved order from ref (survives re-renders)
          // Get the preserved order BEFORE checking anything else
          const preservedOrder = finalDragOrderRef.current;

          if (!preservedOrder) {
            // Fallback: if ref is cleared (shouldn't happen), use server order
            currentList.set(list);
            return;
          }

          // ALWAYS preserve the drag order in the store (card stays in position)
          // Merge server response (for other fields) with preserved order
          const mergedList = {
            ...list,
            urls: preservedOrder, // Always use preserved order (prevents card jumping)
          };

          // CRITICAL: Update the store AND increment key in same flushSync cycle
          // This ensures SortableContext remounts immediately with the NEW items array
          // Without flushSync, the component might re-render with old order, causing bounce-back
          // The key increment forces SortableContext to remount with new items array
          finalDragOrderRef.current = preservedOrder; // Ensure ref is synced

          // Update cache using centralized function (handles both localStorage and global cache)
          if (typeof window !== "undefined" && current.id) {
            updateDragOrderCache(current.id, preservedOrder, false);
          }

          // CRITICAL: Update store AND increment key in same flushSync
          // This ensures SortableContext remounts immediately with new order
          flushSync(() => {
            currentList.set(mergedList);
            // Force immediate re-render by incrementing key in same flushSync
            // This ensures SortableContext sees the new order immediately before any other render
            setSortableContextKey((prev) => prev + 1);
          });

          // NOTE: The order is now preserved in both store AND ref
          // The ref ensures urlsToUse memo uses preserved order during drag
          // The store ensures the final order is persisted after drag completes

          if (process.env.NODE_ENV === "development") {
            console.log(
              "✅ [DRAG] Final store state",
              currentList.get().urls?.map((u: UrlItem) => u.id)
            );
          }

          // Dispatch activity-added event for optimistic feed update (no redundant fetch)
          if (activityData) {
            window.dispatchEvent(
              new CustomEvent("activity-added", {
                detail: {
                  listId: current.id,
                  activity: {
                    id: activityData.id,
                    action: activityData.action,
                    details: activityData.details,
                    createdAt: activityData.createdAt,
                    user: activityData.user,
                  },
                },
              })
            );
          }

          // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 API call
          // This ensures activity feed updates immediately after reorder (same pattern as other URL actions)
          if (current.slug && current.id) {
            invalidateUrlQueries(queryClient, current.slug, current.id, false);
          }

          // DON'T clear localStorage immediately - keep it much longer to survive Fast Refresh
          // Fast Refresh can happen multiple times during development, so we need a longer window
          // Clear ref after a shorter time, but keep localStorage for 60 seconds
          setTimeout(() => {
            finalDragOrderRef.current = null;
          }, 5000); // Clear ref after 5 seconds

          // Keep localStorage for 60 seconds to survive multiple Fast Refresh cycles
          // This is critical because Fast Refresh can happen during/after drag operations
          // Clear previous cleanup timeout to avoid multiple cleanup messages
          if (localStorageCleanupTimeoutRef.current) {
            clearTimeout(localStorageCleanupTimeoutRef.current);
          }
          localStorageCleanupTimeoutRef.current = setTimeout(() => {
            localStorageCleanupTimeoutRef.current = null;
            if (current.id && typeof window !== "undefined") {
              try {
                const storageKey = getDragOrderStorageKey(current.id);
                localStorage.removeItem(storageKey);
                // Also clear global cache
                const globalCache = (window as any).__dragOrderCache;
                if (globalCache) {
                  delete globalCache[storageKey];
                }
              } catch {
                // Ignore localStorage errors
              }
            }
          }, 60000); // Keep for 60 seconds to survive Fast Refresh cycles
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            `❌ [API] PATCH /api/lists/${current.id}/urls - reorder failed:`,
            err
          );
        }
        // Revert on error - fetch the current list
        finalDragOrderRef.current = null; // Clear ref on error
        // Clear localStorage on error (using localStorage instead of sessionStorage)
        if (current.id && typeof window !== "undefined") {
          try {
            localStorage.removeItem(getDragOrderStorageKey(current.id));
          } catch {
            // Ignore localStorage errors
          }
        }
        const currentSlug = currentList.get().slug;
        if (currentSlug) {
          // Use React Query invalidation instead of getList() - triggers unified endpoint refetch
          queryClient.invalidateQueries({
            queryKey: listQueryKeys.unified(currentSlug),
          });
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
      }
    }
  };

  // CRITICAL: Restore drag order from global cache AND localStorage BEFORE urlsToUse memo runs
  // This must happen synchronously during render to ensure correct order on Fast Refresh
  // Using global cache AND localStorage because Fast Refresh might clear localStorage
  // We check global cache first (faster), then localStorage, then restore to ref AND store for immediate effect
  if (list?.id && typeof window !== "undefined") {
    // Only restore if ref is empty (avoid overwriting active drag)
    if (!finalDragOrderRef.current) {
      try {
        const storageKey = getDragOrderStorageKey(list.id);

        // FIRST: Check global cache (survives Fast Refresh)
        const globalCache = (window as any).__dragOrderCache;
        let storedOrder = globalCache?.[storageKey] || null;
        const source = storedOrder ? "global" : null;

        // THEN: Check localStorage if global cache didn't have it
        if (!storedOrder) {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              storedOrder = JSON.parse(stored) as UrlItem[];
            } catch {
              // Invalid JSON, ignore
            }
          }
        }

        // console.log("🔍 [RENDER] Checking for drag order", {
        //   hasGlobalCache: !!globalCache?.[storageKey],
        //   hasStored: !!storedOrder,
        //   source: storedOrder ? source || "localStorage" : "none",
        //   listId: list.id,
        //   refEmpty: !finalDragOrderRef.current,
        // });

        if (storedOrder) {
          const parsed = storedOrder as UrlItem[];
          const currentUrls = (list.urls as unknown as UrlItem[]) || [];

          // console.log("🔍 [RENDER] Found stored order", {
          //   storedLength: parsed.length,
          //   currentLength: currentUrls.length,
          //   storedOrderIds: parsed.map((u: UrlItem) => u.id).join(","),
          //   currentOrder: currentUrls.map((u: UrlItem) => u.id).join(","),
          // });

          // Only restore if same URLs (just reordered)
          if (parsed.length === currentUrls.length) {
            const storedIds = new Set(parsed.map((u: UrlItem) => u.id));
            const currentIds = new Set(currentUrls.map((u: UrlItem) => u.id));
            const sameIds =
              storedIds.size === currentIds.size &&
              [...storedIds].every((id: string) => currentIds.has(id));

            // console.log("🔍 [RENDER] Comparing IDs", {
            //   sameIds,
            //   storedIds: Array.from(storedIds),
            //   currentIds: Array.from(currentIds),
            // });

            if (sameIds) {
              // Check if order actually differs
              const storedOrderIds = parsed.map((u: UrlItem) => u.id).join(",");
              const currentOrder = currentUrls
                .map((u: UrlItem) => u.id)
                .join(",");

              // console.log("🔍 [RENDER] Comparing order", {
              //   storedOrderIds,
              //   currentOrder,
              //   differs: storedOrderIds !== currentOrder,
              // });

              if (storedOrderIds !== currentOrder) {
                finalDragOrderRef.current = parsed;
                // Restore global cache so getList can find it
                // NOTE: Store update is handled by useLayoutEffect to avoid React warnings
                if (typeof window !== "undefined") {
                  (window as any).__dragOrderCache =
                    (window as any).__dragOrderCache || {};
                  (window as any).__dragOrderCache[storageKey] = parsed;
                }
                // Store update will happen in useLayoutEffect to avoid "setState during render" error
              } else {
                // console.log("⏭️ [RENDER] Orders match, no restoration needed");
              }
            } else {
              // console.log("⚠️ [RENDER] Different URLs, cannot restore");
            }
          } else {
            // console.log("⚠️ [RENDER] Different lengths, cannot restore");
          }
        } else {
          // console.log("⏭️ [RENDER] No stored order in localStorage");
        }
      } catch (err) {
        // console.error(
        //   "❌ [RENDER] Failed to read localStorage during render",
        //   err
        // );
      }
    } else {
      // console.log("⏭️ [RENDER] Ref already populated, skipping restoration", {
      //   refOrder: finalDragOrderRef.current.map((u) => u.id).join(","),
      // });
    }
  } else {
    // console.log("⏭️ [RENDER] Cannot restore - missing list.id or window", {
    //   hasListId: !!list?.id,
    //   hasWindow: typeof window !== "undefined",
    // });
  }

  // Filtering and sorting logic
  // CRITICAL: Prioritize preserved drag order from ref OR localStorage (survives Fast Refresh)
  // Using localStorage instead of sessionStorage because Fast Refresh clears sessionStorage
  // If ref/localStorage has a preserved order, use that instead of store (card stays in position)
  // NOTE: This runs SYNCHRONOUSLY during render, so drag library sees correct order immediately
  const urlsToUse = useMemo(() => {
    if (!list?.urls) return [];

    const storeUrls = (list.urls as unknown as UrlItem[]) || [];
    const storeOrder = storeUrls.map((u) => u.id).join(",");

    // CRITICAL: ALWAYS check ref FIRST before store (ref is source of truth during/after drag)
    // The ref is populated during drag and persists after drag completes
    // Even if the store is updated with flushSync, the ref takes precedence
    let preservedOrder = finalDragOrderRef.current;

    // Double-check localStorage if ref is still empty (fallback, using localStorage instead of sessionStorage)
    if (!preservedOrder && list.id && typeof window !== "undefined") {
      try {
        const storageKey = getDragOrderStorageKey(list.id);
        // Also check global cache first (faster)
        const globalCache = (window as any).__dragOrderCache;
        if (globalCache?.[storageKey]) {
          preservedOrder = globalCache[storageKey];
          if (preservedOrder) {
            finalDragOrderRef.current = preservedOrder; // Sync ref
            // console.log(
            //   "📦 [URLS] Restored from global cache in memo",
            //   preservedOrder.map((u) => u.id)
            // );
          }
        } else {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            preservedOrder = JSON.parse(stored) as UrlItem[];
            if (preservedOrder) {
              // Restore to ref AND global cache for faster access
              finalDragOrderRef.current = preservedOrder;
              if (globalCache) {
                globalCache[storageKey] = preservedOrder;
              }
              // console.log(
              //   "📦 [URLS] Restored from localStorage in memo",
              //   preservedOrder.map((u) => u.id)
              // );
            }
          }
        }
      } catch (err) {
        // console.error("❌ [URLS] Failed to read localStorage in memo", err);
      }
    }

    // If we have a preserved drag order, use it (prevents card jumping on Fast Refresh)
    if (preservedOrder) {
      const preservedOrderIds = preservedOrder.map((u) => u.id).join(",");

      // console.log("🔍 [URLS] Checking preserved order", {
      //   hasPreserved: true,
      //   preservedOrder: preservedOrderIds,
      //   storeOrder: storeOrder,
      //   preservedLength: preservedOrder.length,
      //   storeLength: storeUrls.length,
      // });

      // Only use preserved order if:
      // 1. Both arrays have same length (no URLs added/removed)
      // 2. Both arrays contain same URL IDs (just reordered)
      if (preservedOrder.length === storeUrls.length) {
        const preservedIds = new Set(preservedOrder.map((u) => u.id));
        const storeIds = new Set(storeUrls.map((u) => u.id));
        const sameIds =
          preservedIds.size === storeIds.size &&
          [...preservedIds].every((id) => storeIds.has(id));

        // console.log("🔍 [URLS] ID comparison", {
        //   sameIds,
        //   preservedIds: Array.from(preservedIds),
        //   storeIds: Array.from(storeIds),
        //   orderMatch: preservedOrderIds === storeOrder,
        // });

        if (sameIds) {
          // Same URLs, just reordered - use preserved order BUT merge with latest store data
          // This ensures we use preserved order for positioning, but get latest clickCount and other dynamic fields
          if (preservedOrderIds !== storeOrder) {
            // console.log(
            //   "✅ [URLS] Using preserved order (different from store)",
            //   {
            //     preserved: preservedOrderIds,
            //     store: storeOrder,
            //   }
            // );
          } else {
            // console.log(
            //   "✅ [URLS] Preserved order matches store, using preserved",
            //   {
            //     order: preservedOrderIds,
            //   }
            // );
          }
          // CRITICAL: Merge preserved order with latest store data
          // This preserves drag order while getting updated clickCount and other dynamic fields
          const storeUrlMap = new Map(storeUrls.map((u: UrlItem) => [u.id, u]));
          const mergedOrder = preservedOrder.map((preservedUrl) => {
            const latestStoreUrl = storeUrlMap.get(preservedUrl.id);
            if (latestStoreUrl) {
              // Merge: use preserved order but update with latest store data (clickCount, etc.)
              return { ...preservedUrl, ...latestStoreUrl };
            }
            return preservedUrl; // Fallback if not found in store
          });
          return mergedOrder;
        } else {
          // Reduced to debug level - this is expected behavior when URLs are replaced
          // The system correctly detects and ignores stale data, so this is not a warning
          if (process.env.NODE_ENV === "development") {
            // console.debug(
            //   "ℹ️ [URLS] Preserved order has different URLs (URLs replaced), ignoring",
            //   {
            //     preserved: preservedOrderIds,
            //     store: storeOrder,
            //   }
            // );
          }

          // CRITICAL: Also clear stale cache immediately when IDs don't match
          // This prevents stale data from being checked again in subsequent renders
          // Safe because: System already ignores stale data, and cache was already cleared on delete
          // This is a cleanup for any remaining stale data in global cache
          if (list?.id && typeof window !== "undefined") {
            try {
              const storageKey = getDragOrderStorageKey(list.id);
              const globalCache = (window as any).__dragOrderCache;
              if (globalCache && globalCache[storageKey]) {
                delete globalCache[storageKey];
              }
              // Also ensure localStorage is cleared (defensive - should already be cleared)
              localStorage.removeItem(storageKey);
            } catch {
              // Ignore errors - not critical
            }
          }
        }
      } else {
        // Reduced to debug level - this is expected behavior when URLs are added/deleted
        // The system correctly detects and ignores stale data, so this is not a warning
        if (process.env.NODE_ENV === "development") {
          // console.debug(
          //   "ℹ️ [URLS] Preserved order has different length (URLs added/deleted), ignoring",
          //   {
          //     preservedLength: preservedOrder.length,
          //     storeLength: storeUrls.length,
          //   }
          // );
        }

        // CRITICAL: Also clear stale cache immediately when mismatch is detected
        // This prevents stale data from being checked again in subsequent renders
        // Safe because: System already ignores stale data, and cache was already cleared on delete
        // This is a cleanup for any remaining stale data in global cache
        if (list?.id && typeof window !== "undefined") {
          try {
            const storageKey = getDragOrderStorageKey(list.id);
            const globalCache = (window as any).__dragOrderCache;
            if (globalCache && globalCache[storageKey]) {
              delete globalCache[storageKey];
            }
            // Also ensure localStorage is cleared (defensive - should already be cleared)
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              const storedData = JSON.parse(stored) as UrlItem[];
              if (storedData.length !== storeUrls.length) {
                localStorage.removeItem(storageKey);
              }
            }
          } catch {
            // Ignore errors - not critical
          }
        }
      }
    } else {
      // console.log("🔍 [URLS] No preserved order found", {
      //   refEmpty: !finalDragOrderRef.current,
      //   hasLocalStorage:
      //     list.id && typeof window !== "undefined"
      //       ? !!localStorage.getItem(getDragOrderStorageKey(list.id))
      //       : false,
      // });
    }

    // Otherwise use store URLs (normal case)
    // console.log("📋 [URLS] Using store URLs", storeOrder);
    return storeUrls;
  }, [list?.urls, list?.id]);

  // REMOVED: dragContextKey - was causing DragDropContext to remount during drag
  // This was breaking drag operations. The preserved order in sessionStorage/ref
  // should be enough to maintain correct order after Fast Refresh.

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
      // Use position for ordering when available (much simpler than array reordering!)
      // Default to createdAt if position not set (backward compatibility)
      unpinnedUrls.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        if (a.position !== undefined) return -1;
        if (b.position !== undefined) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      pinnedUrls.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        if (a.position !== undefined) return -1;
        if (b.position !== undefined) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
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
    const result = [...pinnedUrls, ...unpinnedUrls];

    // Debug logging for click count updates in filtered URLs
    if (process.env.NODE_ENV === "development") {
      const urlWithClickCount = result.find(
        (u) => u.clickCount !== undefined && u.clickCount > 0
      );
      if (urlWithClickCount) {
        console.log("🔍 [FILTERED_URLS] filteredAndSortedUrls computed:", {
          totalUrls: result.length,
          urlWithClickCount: {
            id: urlWithClickCount.id,
            title: urlWithClickCount.title?.substring(0, 30),
            clickCount: urlWithClickCount.clickCount,
          },
          listUrlsLength: list?.urls
            ? (list.urls as unknown as UrlItem[]).length
            : 0,
        });
      }
    }

    return result;
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
    // Set flag for restore operation
    isLocalOperationRef.current = true;

    // Notify activity feed to skip fetch after local operation
    window.dispatchEvent(new CustomEvent("local-operation"));

    const current = currentList.get();
    if (!current?.archivedUrls) return;

    // Get URL details for toast
    const archivedUrlsList = current.archivedUrls as unknown as UrlItem[];
    const urlToRestore = archivedUrlsList.find((url) => url.id === urlId);
    const urlTitle = urlToRestore?.title || urlToRestore?.url || "URL";

    try {
      const { restoreArchivedUrl } = await import("@/stores/urlListStore");
      await restoreArchivedUrl(urlId);

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // Store function already dispatches activity-added event, but we need to invalidate cache
      if (current?.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }

      // Show success toast
      toast({
        title: "URL Restored",
        description: `"${urlTitle}" has been restored and added back to the list.`,
        variant: "success",
      });
    } catch (err) {
      console.error("Failed to restore URL:", err);
      // Revert on error - use React Query invalidation to trigger unified endpoint refetch
      if (current?.slug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(current.slug),
        });
      }
      // Show error toast
      toast({
        title: "Restore Failed",
        description:
          err instanceof Error ? err.message : "Failed to restore URL",
        variant: "error",
      });
    } finally {
      // Clear the flag after a delay
      setTimeout(() => {
        isLocalOperationRef.current = false;
      }, 1000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs for Active/Archived and Add URL Button */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-3">
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

        {/* Add URL Button - show for all users, but disable for viewers */}
        {!showArchived && (
          <Button
            type="button"
            disabled={!permissions.canEdit}
            onClick={() => {
              if (!permissions.canEdit) return; // Prevent action if disabled
              setIsAddUrlFormExpanded(!isAddUrlFormExpanded);
              if (isAddUrlFormExpanded) {
                // Collapse: clear form and reset states
                setNewUrl("");
                setNewNote("");
                setNewTags("");
                setEnhancementResult(null);
                setError(undefined);
              }
            }}
            className={`bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg ${
              !permissions.canEdit ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <CirclePlus className="h-4 w-4" />
            Add URL
          </Button>
        )}
      </div>

      {/* Add URL Form - Expandable - only show for active URLs and users who can edit */}
      {!showArchived && isAddUrlFormExpanded && permissions.canEdit && (
        <UrlAddForm
          newUrl={newUrl}
          setNewUrl={setNewUrl}
          newTags={newTags}
          setNewTags={setNewTags}
          newNote={newNote}
          setNewNote={setNewNote}
          error={error}
          isLoading={isLoading}
          onAdd={handleAddUrl}
          onClear={() => {
            setEnhancementResult(null);
          }}
          isExpanded={isAddUrlFormExpanded}
        />
      )}

      {/* Search, Filter, and Import/Export bar - Same Row, Responsive */}
      {!showArchived && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search URLs, titles, or descriptions... (AI-powered)"
              className="w-full text-sm sm:text-base lg:text-lg shadow-md font-delicious min-w-[180px] bg-transparent pr-16 sm:pr-20 py-2 sm:py-2.5"
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

          {/* Filter Dropdown */}
          <UrlFilterBar sortOption={sortOption} setSortOption={setSortOption} />

          {/* Import/Export Bar */}
          <UrlBulkImportExport
            urls={(list.urls as unknown as UrlItem[]) || []}
            listTitle={list.title}
            canEdit={permissions.canEdit} // Disable import for viewers
            onBulkOperationStart={() => {
              isLocalOperationRef.current = true;
            }}
            onBulkOperationEnd={() => {
              isLocalOperationRef.current = false;
            }}
          />
        </div>
      )}

      {/* Active URLs List */}
      {!showArchived && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragOver={(event: DragOverEvent) => {
            // Update store during drag so order is correct when drag ends
            // This ensures the drag library sees the new order immediately
            // Only works for simple view (no filtering/sorting)
            const { active, over } = event;
            if (!over || active.id === over.id) {
              return;
            }

            // Only update for simple view (no filtering/sorting active)
            const isFilteringActive = search.trim() || sortOption !== "latest";
            if (isFilteringActive) {
              return; // Skip for filtered views - handle in onDragEnd
            }

            const current = currentList.get();
            if (!current.urls || !current.id) return;

            const currentUrls = current.urls as unknown as UrlItem[];
            const oldIndex = currentUrls.findIndex((u) => u.id === active.id);
            const newIndex = currentUrls.findIndex((u) => u.id === over.id);

            if (oldIndex === -1 || newIndex === -1) {
              return;
            }

            // Only update if destination actually changed (prevent excessive updates)
            const updateKey = `${oldIndex}-${newIndex}`;
            if (lastDragUpdateRef.current === updateKey) {
              return;
            }
            lastDragUpdateRef.current = updateKey;

            const reorderedUrls = arrayMove(currentUrls, oldIndex, newIndex);

            // CRITICAL: Store in ref AND localStorage ONLY - don't update store during drag
            // This prevents dnd-kit from recalculating positions mid-drag, which causes bounce-back
            // The urlsToUse memo will use ref/localStorage, and store will be updated after drag ends
            // Updating store during drag causes re-renders that interfere with dnd-kit's drag calculations
            // and triggers React errors about flushSync being called during render lifecycle
            finalDragOrderRef.current = reorderedUrls;

            // Also store in localStorage (survives Fast Refresh)
            if (current.id && typeof window !== "undefined") {
              try {
                const storageKey = getDragOrderStorageKey(current.id);
                localStorage.setItem(storageKey, JSON.stringify(reorderedUrls));

                // Also update global cache
                const globalCache = (window as any).__dragOrderCache || {};
                globalCache[storageKey] = reorderedUrls;
                (window as any).__dragOrderCache = globalCache;
              } catch {
                // Ignore localStorage errors
              }
            }

            // NOTE: Store update happens ONLY in handleDragEnd after drag completes
            // This ensures dnd-kit can calculate animations correctly without interference
          }}
        >
          <SortableContext
            key={sortableContextKey}
            items={filteredAndSortedUrls.map((u) => u.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-8">
              {filteredAndSortedUrls.map((url) => {
                return (
                  <UrlCardWrapper
                    key={url.id}
                    url={url}
                    onEdit={(urlObj) => {
                      setEditingUrl(urlObj);
                      setEditingTags(urlObj.tags?.join(", ") || "");
                      setEditingNotes(urlObj.notes || "");
                      setEditingReminder(urlObj.reminder || "");
                    }}
                    onDelete={(urlId) => {
                      // Set flag to prevent real-time refresh and metadata batch fetch during delete
                      isLocalOperationRef.current = true;
                      lastDeleteTimeRef.current = Date.now(); // Track delete time to prevent real-time refresh

                      // Clean up React Query cache for deleted URL before delete
                      const current = currentList.get();
                      if (current?.urls) {
                        const currentUrls =
                          current.urls as unknown as UrlItem[];
                        const deletedUrl = currentUrls.find(
                          (url) => url.id === urlId
                        );
                        if (deletedUrl) {
                          queryClient.removeQueries({
                            queryKey: listQueryKeys.urlMetadata(deletedUrl.url),
                          });
                        }
                      }

                      // Perform delete (it does optimistic update internally)
                      removeUrlFromList(urlId)
                        .catch((err) => {
                          console.error("Failed to delete URL:", err);
                          // Revert on error - use React Query invalidation to trigger unified endpoint refetch
                          if (current?.slug) {
                            queryClient.invalidateQueries({
                              queryKey: listQueryKeys.unified(current.slug),
                            });
                          }
                        })
                        .finally(() => {
                          // Clear flag after operation completes
                          setTimeout(() => {
                            isLocalOperationRef.current = false;
                          }, 2000);
                        });
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    onShare={handleShare}
                    onUrlClick={handleUrlClick}
                    onDuplicate={handleDuplicate}
                    onArchive={handleArchive}
                    onPin={handlePin}
                    shareTooltip={shareTooltip}
                    isMetadataReady={isMetadataReady}
                    canEdit={permissions.canEdit}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
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
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-4 sm:p-6"
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
                    disabled={!permissions.canEdit}
                    onClick={() => {
                      if (!permissions.canEdit) return; // Prevent action if disabled
                      handleRestore(url.id);
                    }}
                    className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg ${
                      !permissions.canEdit
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
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
