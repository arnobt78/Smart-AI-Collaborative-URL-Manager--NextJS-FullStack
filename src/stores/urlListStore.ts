import { atom, map } from "nanostores";
import { queryClient } from "@/lib/react-query";
import type { UrlMetadata } from "@/utils/urlMetadata";
import {
  syncDragOrderCacheWithServer,
  getCachedDragOrder,
  updateDragOrderCache,
  clearDragOrderCache,
  getDragOrderStorageKey,
} from "./dragOrderCache";

export interface UrlItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string; // ISO date string - when URL was last modified
  isFavorite: boolean;
  isPinned?: boolean; // Pin URL to top of list
  tags?: string[];
  category?: string; // AI-generated category (Tech, Design, Business, etc.)
  notes?: string;
  reminder?: string; // ISO date string
  clickCount?: number; // Track how many times this URL has been clicked
  position?: number; // Position in the list (used for ordering) - simpler than array reordering
  // URL Health Monitoring fields
  healthStatus?: "healthy" | "warning" | "broken" | "unknown"; // Health status
  healthCheckedAt?: string; // ISO date string - when health was last checked
  healthLastStatus?: number; // Last HTTP status code received
  healthResponseTime?: number; // Response time in milliseconds
}

export interface UrlList {
  id: string;
  slug: string;
  title?: string;
  description?: string;
  urls: UrlItem[];
  archivedUrls?: UrlItem[]; // Array of archived URLs
  createdAt: string;
  updatedAt?: string;
  isPublic?: boolean;
  collaborators?: string[]; // user emails or ids (legacy)
  collaboratorRoles?: Record<string, string>; // JSON object mapping email -> role: { "email@example.com": "editor" }
}

// Initialize with empty list state
export const currentList = map<Partial<UrlList>>({});
export const isLoading = atom<boolean>(false);
export const error = atom<string | null>(null);

/**
 * Helper function to dispatch activity events for optimistic updates
 * UNIFIED APPROACH: Only dispatch activity-added for immediate optimistic feedback
 * SSE will handle ALL activity-updated events (single source of truth)
 * This prevents duplicate API calls and simplifies the codebase
 */
function dispatchActivityEvents(
  listId: string,
  activity: {
    id: string;
    action: string;
    details: any;
    createdAt: string;
    user: { id: string; email: string };
  }
) {
  if (typeof window === "undefined") return;

  // Dispatch activity-added for optimistic update (shows immediately in feed)
  window.dispatchEvent(
    new CustomEvent("activity-added", {
      detail: { listId, activity },
    })
  );

  // Note: activity-updated is ONLY dispatched by SSE (useRealtimeList hook)
  // This ensures single source of truth - ONE API call per action, works on all screens
}

// Global flag to prevent getList from overwriting optimistic updates during drag
// This is set by the component during drag operations
let isDragInProgress = false;

export function setDragInProgress(value: boolean) {
  isDragInProgress = value;
}

// Track pending getList requests so we can cancel them
let activeGetListController: AbortController | null = null;

export async function getList(
  slug: string,
  skipIfDragInProgress = false,
  abortSignal?: AbortSignal
) {
  // CRITICAL: Skip ALL getList calls during bulk import to prevent spam
  if (typeof window !== "undefined" && (window as any).__bulkImportActive) {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        `⏭️ [STORE] Skipping getList('${slug}') - bulk import in progress`
      );
    }
    // Return current list state if available, otherwise null
    const current = currentList.get();
    return (current?.slug === slug ? (current as UrlList) : null);
  }

  // Skip if drag is in progress and we're asked to respect it
  if (skipIfDragInProgress && isDragInProgress) {
    const current = currentList.get();
    return current as UrlList | null;
  }

  // Check if already aborted before starting
  if (abortSignal?.aborted) {
    return null;
  }

  // Cancel any existing getList request
  if (activeGetListController) {
    activeGetListController.abort();
    activeGetListController = null;
  }

  // Create new abort controller for this request
  const controller = new AbortController();
  activeGetListController = controller;

  // Combine abort signals (external + internal)
  if (abortSignal) {
    if (abortSignal.aborted) {
      return null;
    }
    const abortHandler = () => controller.abort();
    abortSignal.addEventListener("abort", abortHandler);
    // Clean up listener when request completes
    const cleanup = () => {
      abortSignal.removeEventListener("abort", abortHandler);
    };
    (controller.signal as any)._cleanup = cleanup;
  }

  isLoading.set(true);
  error.set(null);

  try {
    // Add timeout to prevent hanging indefinitely (5 seconds max - reduced from 10)
    // This prevents getList requests from hanging and blocking the UI
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error("getList timeout after 5 seconds"));
      }, 5000);
    });

    // Register with global abort registry to ensure cleanup
    if (typeof window !== "undefined") {
      try {
        const { abortRegistry } = await import("@/utils/abortRegistry");
        if (abortRegistry) {
          abortRegistry.register(controller);
        }
      } catch {
        // Ignore import errors
      }
    }

    const fetchPromise = fetch(`/api/lists/${slug}`, {
      signal: controller.signal,
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // Unregister from abort registry after successful fetch
    if (typeof window !== "undefined") {
      try {
        const { abortRegistry } = await import("@/utils/abortRegistry");
        if (abortRegistry) {
          abortRegistry.unregister(controller);
        }
      } catch {
        // Ignore import errors
      }
    }

    // Clean up abort listener
    if ((controller.signal as any)?._cleanup) {
      (controller.signal as any)._cleanup();
    }

    // Handle 401 Unauthorized - user needs to login first
    if (response.status === 401) {
      // Store the current URL for redirect after login
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        sessionStorage.setItem("authRedirect", currentPath);
        console.log("🔒 [AUTH] 401 detected - stored redirect URL:", currentPath);
        
        // IMMEDIATELY redirect to login page - synchronous redirect
        // Use replace() to prevent back button issues and ensure immediate redirect
        window.location.replace("/");
        
        // Also throw error so component can handle it if redirect somehow fails
        const error = new Error("Unauthorized - Please login to access this list");
        (error as any).status = 401;
        (error as any).code = "UNAUTHORIZED";
        throw error;
      }
    }

    if (!response.ok) {
      const error = new Error(`Failed to fetch list: ${response.status} ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    const { list } = await response.json();

    // Check if list actually changed
    const current = currentList.get();
    const currentUrls = (current?.urls as unknown as UrlItem[]) || [];
    const newUrls = (list?.urls as unknown as UrlItem[]) || [];
    const currentOrder = currentUrls.map((u) => u.id).join(",");
    const newOrder = newUrls.map((u) => u.id).join(",");

    // Check for changes in list metadata
    // Use strict comparison for boolean values (isPublic) to catch all changes
    const idChanged = current?.id !== list?.id;
    const titleChanged = current?.title !== list?.title;
    const descriptionChanged = current?.description !== list?.description;
    const isPublicChanged =
      Boolean(current?.isPublic) !== Boolean(list?.isPublic);
    const collaboratorsChanged =
      JSON.stringify(current?.collaborators || []) !==
      JSON.stringify(list?.collaborators || []);
    // Check for collaboratorRoles changes (critical for permission updates)
    const collaboratorRolesChanged =
      JSON.stringify(current?.collaboratorRoles || {}) !==
      JSON.stringify(list?.collaboratorRoles || {});

    const metadataChanged =
      idChanged ||
      titleChanged ||
      descriptionChanged ||
      isPublicChanged ||
      collaboratorsChanged ||
      collaboratorRolesChanged;

    // Check for changes in URLs (length, order, or content)
    const urlsLengthChanged = currentUrls.length !== newUrls.length;
    const urlsOrderChanged = currentOrder !== newOrder;

    // Check if URL content changed (title, url, tags, notes, properties)
    // Create maps for quick lookup
    const currentUrlMap = new Map(currentUrls.map((u) => [u.id, u]));
    const newUrlMap = new Map(newUrls.map((u) => [u.id, u]));
    let urlsContentChanged = false;

    // Check if any URLs were removed
    for (const currentUrl of currentUrls) {
      if (!newUrlMap.has(currentUrl.id)) {
        urlsContentChanged = true;
        break;
      }
    }

    // Check if any URLs were added or content changed
    if (!urlsContentChanged) {
      for (const newUrl of newUrls) {
        const currentUrl = currentUrlMap.get(newUrl.id);
        if (!currentUrl) {
          // New URL added
          urlsContentChanged = true;
          break;
        }
        // Check if URL content changed
        if (
          currentUrl.title !== newUrl.title ||
          currentUrl.url !== newUrl.url ||
          JSON.stringify(currentUrl.tags || []) !==
            JSON.stringify(newUrl.tags || []) ||
          currentUrl.notes !== newUrl.notes ||
          currentUrl.isFavorite !== newUrl.isFavorite ||
          currentUrl.isPinned !== newUrl.isPinned ||
          currentUrl.reminder !== newUrl.reminder ||
          currentUrl.healthStatus !== newUrl.healthStatus ||
          currentUrl.clickCount !== newUrl.clickCount
        ) {
          urlsContentChanged = true;
          break;
        }
      }
    }

    const hasChanged =
      metadataChanged ||
      urlsLengthChanged ||
      urlsOrderChanged ||
      urlsContentChanged;

    if (hasChanged) {
      // CRITICAL: Check localStorage AND global cache for preserved drag order BEFORE deciding to update
      // This prevents getList from overwriting drag order even after Fast Refresh
      // Using localStorage AND global variable because Fast Refresh might clear localStorage
      // Use list.id from server (always available) instead of current?.id (might be empty after Fast Refresh)
      // Use centralized cache management for drag order
      // This handles: URL add/delete, drag operations, HMR, SSE real-time updates
      let preservedOrder: UrlItem[] | null = null;
      if (typeof window !== "undefined" && list?.id) {
        try {
          // Sync cache with server state (clears stale data, validates current data)
          const syncResult = syncDragOrderCacheWithServer(
            list.id,
            newUrls,
            skipIfDragInProgress && isDragInProgress
          );

          if (syncResult.cleared) {
            // console.log("🧹 [STORE] Synced cache with server - cleared stale data", {
            //   listId: list.id,
            //   serverCount: newUrls.length,
            // });
          } else if (syncResult.updated) {
            // console.log("🔄 [STORE] Synced cache with server - updated cache", {
            //   listId: list.id,
            //   serverCount: newUrls.length,
            // });
          }

          // Get cached order if valid (after sync, so it's guaranteed to be valid)
          preservedOrder = getCachedDragOrder(list.id, newUrls);

          if (preservedOrder) {
            // console.log("✅ [STORE] Found valid cached drag order", {
            //   listId: list.id,
            //   order: preservedOrder.map((u) => u.id),
            //   count: preservedOrder.length,
            // });
          }
        } catch (err) {
          // console.error(
          //   "❌ [STORE] Failed to sync drag order cache in getList",
          //   err
          // );
        }
      }

      // Create a map of server URLs by ID for quick lookup (contains latest data like clickCount)
      const serverUrlMap = new Map(newUrls.map((u) => [u.id, u]));

      // Helper function to merge preserved order with server data
      // Preserves order from cache, but uses fresh data (clickCount, etc.) from server
      const mergeOrderWithServerData = (orderUrls: UrlItem[]): UrlItem[] => {
        return orderUrls
          .map((cachedUrl) => {
            const serverUrl = serverUrlMap.get(cachedUrl.id);
            if (serverUrl) {
              // Use server data (has latest clickCount, etc.) but preserve order
              return serverUrl;
            }
            // URL not in server (shouldn't happen if cache is valid, but handle gracefully)
            return cachedUrl;
          })
          .filter((url) => url !== undefined) as UrlItem[];
      };

      // CRITICAL: If collaboratorRoles changed, always update store immediately (affects permissions)
      // This must happen even if we're preserving drag order
      if (collaboratorRolesChanged) {
        // If we have preserved order, merge it but ensure collaboratorRoles from server is used
        if (preservedOrder && !urlsLengthChanged && !urlsContentChanged) {
          const mergedUrls = mergeOrderWithServerData(preservedOrder);
          const mergedList = {
            ...list, // Includes updated collaboratorRoles from server
            urls: mergedUrls, // Preserve order but use latest server data
          };
          console.log("🔄 [STORE] Updating collaboratorRoles while preserving drag order");
          currentList.set(mergedList);
          return currentList.get() as UrlList;
        }
        // Otherwise, update normally (will preserve order if needed below)
      }

      // If ONLY order changed (same URLs, same content, just reordered), preserve optimistic order
      // This prevents server refreshes from overwriting drag operations
      if (
        urlsOrderChanged &&
        !urlsLengthChanged &&
        !urlsContentChanged &&
        !metadataChanged &&
        currentUrls.length > 0
      ) {
        // This is ONLY a reorder - preserve the current (optimistic) order OR sessionStorage order
        const orderToUse = preservedOrder || currentUrls;
        // Merge order with server data to get latest clickCount values
        const mergedUrls = mergeOrderWithServerData(orderToUse);
        const mergedList = {
          ...list,
          urls: mergedUrls, // Keep order but use latest server data
        };
        // console.log("🔄 [STORE] Preserving drag order (only order changed)", {
        //   preserved: orderToUse.map((u) => u.id),
        //   server: newUrls.map((u) => u.id),
        // });
        currentList.set(mergedList);
        return currentList.get() as UrlList; // Return the preserved state
      } else if (preservedOrder && !collaboratorRolesChanged) {
        // Even if URLs changed, if we have preserved order, use it (drag in progress)
        // BUT: Skip if collaboratorRoles changed (already handled above)
        // Merge with server data to get latest clickCount and other dynamic fields
        const mergedUrls = mergeOrderWithServerData(preservedOrder);
        const mergedList = {
          ...list,
          urls: mergedUrls, // Preserve order, but use latest server data
        };
        // console.log("🔄 [STORE] Preserving drag order (drag in progress)", {
        //   preserved: preservedOrder.map((u) => u.id),
        //   server: newUrls.map((u) => u.id),
        // });
        currentList.set(mergedList);
        return currentList.get() as UrlList;
      } else {
        // Normal update - URLs were added/removed/changed OR metadata changed
        // BUT: Check if current store has a different order than server (possible drag in progress)
        // If so, preserve current order if it's a reorder (same URLs, just different order)
        // IMPORTANT: Always include collaboratorRoles from server even when preserving order
        if (
          !urlsLengthChanged &&
          !urlsContentChanged &&
          urlsOrderChanged &&
          !collaboratorRolesChanged &&
          currentUrls.length > 0 &&
          newUrls.length > 0
        ) {
          // This is a reorder - preserve current order (user's action) over server order
          // BUT: Skip if collaboratorRoles changed (already handled above)
          const currentIds = new Set(currentUrls.map((u) => u.id));
          const serverIds = new Set(newUrls.map((u) => u.id));
          const sameIds =
            currentIds.size === serverIds.size &&
            [...currentIds].every((id) => serverIds.has(id));

          if (sameIds) {
            // Same URLs, just different order - preserve current (user's drag order)
            // BUT: Merge with server data to get latest clickCount and other dynamic fields
            const mergedUrls = currentUrls.map((currentUrl) => {
              const serverUrl = serverUrlMap.get(currentUrl.id);
              return serverUrl || currentUrl; // Use server data if available, otherwise current
            });
            const mergedList = {
              ...list, // Always includes latest collaboratorRoles from server
              urls: mergedUrls, // Keep current order but use latest server data
            };
            // console.log(
            //   "🔄 [STORE] Preserving current order (reorder detected)",
            //   {
            //     current: currentUrls.map((u) => u.id),
            //     server: newUrls.map((u) => u.id),
            //     note: "User's drag order preserved over server order",
            //   }
            // );
            currentList.set(mergedList);
            return currentList.get() as UrlList;
          }
        }

        // Normal update - URLs were added/removed/changed OR metadata changed
        // Always update from server for content/metadata changes (especially for cross-window updates)
        // Sync cache with server state after update (handles URL add/delete/SSE updates)
        if (list?.id) {
          syncDragOrderCacheWithServer(list.id, newUrls, skipIfDragInProgress && isDragInProgress);
        }
        
        // console.log("🔄 [STORE] Using server order (normal update)", {
        //   server: newUrls.map((u) => u.id),
        //   current: currentUrls.map((u) => u.id),
        // });
        currentList.set(list);
      }
    }
    return (currentList.get() as UrlList) || list;
  } catch (err) {
    // Unregister from abort registry on error
    if (typeof window !== "undefined" && controller) {
      // Use dynamic import without await (fire and forget)
      import("@/utils/abortRegistry")
        .then(({ abortRegistry }) => {
          if (abortRegistry) {
            abortRegistry.unregister(controller);
          }
        })
        .catch(() => {
          // Ignore import errors
        });
    }

    // Check if this is a 401 Unauthorized error - redirect already handled
    const isUnauthorized =
      err instanceof Error &&
      ((err as any).status === 401 || (err as any).code === "UNAUTHORIZED");
    
    // Check if this is an abort error or timeout
    const isAborted =
      err instanceof Error &&
      (err.name === "AbortError" ||
        err.message === "getList timeout after 5 seconds" ||
        err.message.includes("aborted"));

    // Don't set error for abort/timeout or unauthorized (redirect already handled)
    if (!isAborted && !isUnauthorized) {
      error.set(err instanceof Error ? err.message : "Failed to fetch list");
    }
    
    // For 401, redirect already happened - just return null silently
    if (isUnauthorized) {
      return null;
    }

    if (process.env.NODE_ENV === "development" && isAborted) {
      console.debug(`getList fetch aborted for slug: ${slug}`);
    }

    return null;
  } finally {
    // Clean up controller reference
    if (activeGetListController === controller) {
      activeGetListController = null;
    }
    // Clean up abort signal listener
    if ((controller.signal as any)?._cleanup) {
      (controller.signal as any)._cleanup();
    }
    isLoading.set(false);
  }
}

// Export function to cancel all pending getList requests
export function cancelPendingGetList() {
  if (activeGetListController) {
    activeGetListController.abort();
    activeGetListController = null;
  }
}

export async function addUrlToList(
  url: string,
  title?: string,
  tags: string[] = [],
  notes: string = "",
  reminder?: string,
  category?: string,
  existingMetadata?: unknown, // Optional metadata from cache (to avoid re-fetching)
  isDuplicate?: boolean, // Optional flag to indicate this is a duplicate operation
  abortSignal?: AbortSignal // Optional abort signal to cancel the request
) {
  const current = currentList.get();
  if (!current.id || !current.urls) return;

  // Check if already aborted before starting
  if (abortSignal?.aborted) {
    throw new Error("Request aborted");
  }

  isLoading.set(true);
  error.set(null);

  try {
    const newUrl: UrlItem = {
      id: crypto.randomUUID(),
      url,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      tags,
      notes,
      reminder,
      category,
      clickCount: 0,
    };

    const currentUrls = current.urls as unknown as UrlItem[];
    const updatedUrls = [...currentUrls, newUrl];

    // CRITICAL: Clear cache IMMEDIATELY before optimistic update
    // This prevents component render from seeing stale cache (n URLs when server will have n+1)
    // Must happen BEFORE store update to ensure cache is clean when component renders
    // Preserves drag operations, HMR, and SSE by clearing only when URLs actually change
    if (updatedUrls.length !== currentUrls.length && current.id) {
      clearDragOrderCache(current.id);
    }

    // Optimistic update - add immediately
    currentList.set({ ...current, urls: updatedUrls });

    // Use unified POST endpoint that handles add, metadata fetching, activity, and real-time updates
    // Pass abort signal to fetch to allow cancellation
    // Register with global abort registry to ensure cleanup
    const controller = new AbortController();
    
    // If abortSignal is provided, link it to our controller
    if (abortSignal) {
      if (abortSignal.aborted) {
        throw new Error("Request aborted");
      }
      abortSignal.addEventListener("abort", () => controller.abort());
    }
    
    // Register controller synchronously with abort registry
    // CRITICAL: Must import synchronously to ensure registration happens before fetch
    if (typeof window !== "undefined") {
      // Use direct import (abortRegistry is already imported at top of file)
      // But we need to handle the case where it might not be available yet
      import("@/utils/abortRegistry").then(({ abortRegistry }) => {
        if (abortRegistry) {
          abortRegistry.register(controller);
        }
      }).catch(() => {
        // Ignore import errors
      });
    }

    const response = await fetch(`/api/lists/${current.id}/urls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        title,
        tags,
        notes,
        reminder,
        category,
        metadata: existingMetadata, // Pass existing metadata if available (from AI enhancement or cache)
        isDuplicate: isDuplicate || false, // Pass duplicate flag if this is a duplicate operation
      }),
      signal: controller.signal || abortSignal, // Pass abort signal to fetch
    }).finally(() => {
      // Clean up controller after fetch completes
      if (typeof window !== "undefined") {
        import("@/utils/abortRegistry").then(({ abortRegistry }) => {
          if (abortRegistry) {
            abortRegistry.unregister(controller);
          }
        }).catch(() => {
          // Ignore import errors
        });
      }
    });

    if (!response.ok) throw new Error("Failed to add URL");

    const {
      list,
      url: serverUrl,
      metadata: urlMetadata,
      activity: activityData,
    } = await response.json();

    // Merge server response with optimistic state
    // Server response is the source of truth, but preserve optimistic order
    const serverUrls = (list.urls as unknown as UrlItem[]) || [];
    const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));

    // Update optimistic URLs with server data (serverUrl has the final data)
    const finalUrls = updatedUrls.map((url) => {
      if (url.id === newUrl.id && serverUrl) {
        // Use server URL data (it has metadata, etc.)
        return serverUrl as UrlItem;
      }
      const serverUrlData = serverUrlMap.get(url.id);
      return serverUrlData ? { ...url, ...serverUrlData } : url;
    });

    // Pre-populate metadata in React Query cache SYNCHRONOUSLY so cards don't fetch
    if (typeof window !== "undefined" && urlMetadata && url) {
      try {
        // Populate React Query cache SYNCHRONOUSLY before component re-renders
        const queryKey = ["url-metadata", url] as const;
        queryClient.setQueryData<UrlMetadata>(queryKey, urlMetadata);

        // Also dispatch event for backward compatibility
        window.dispatchEvent(
          new CustomEvent("metadata-cached", {
            detail: { url, metadata: urlMetadata },
          })
        );

        // Also save to localStorage
        const key = `react-query:${queryKey.join(":")}`;
        localStorage.setItem(
          key,
          JSON.stringify({ data: urlMetadata, timestamp: Date.now() })
        );
      } catch {
        // Ignore localStorage errors
      }
    }

    // Dispatch activity data for optimistic feed update
    // Use user data from activityData if available (from API response), otherwise fetch session
    if (typeof window !== "undefined" && activityData && current.id) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
          dispatchActivityEvents(current.id, {
            id: activityData.id,
            action: activityData.action,
            details: activityData.details,
            createdAt: activityData.createdAt,
            user: activityData.user,
          });
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              // Dispatch activity with user email for optimistic update
              dispatchActivityEvents(current.id, {
                id: activityData.id,
                action: activityData.action,
                details: activityData.details,
                createdAt: activityData.createdAt,
                user: {
                  id: user.id,
                  email: user.email,
                },
              });
            }
          }
        }
      } catch {
        // Ignore errors - real-time event will handle it
      }
    }

    // Note: Activity feed will also update via real-time SSE event
    // But optimistic update provides instant feedback and activity-updated ensures refresh

    currentList.set({ ...list, urls: finalUrls });
    return { ...list, urls: finalUrls };
  } catch (err) {
    // Revert on error
    error.set(err instanceof Error ? err.message : "Failed to update list");
    if (current.slug) {
      await getList(current.slug);
    }
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function updateUrlInList(
  urlId: string,
  updates: Partial<UrlItem>,
  optimisticUpdate?: (urls: UrlItem[]) => UrlItem[],
  existingMetadata?: UrlMetadata
) {
  const current = currentList.get();
  if (!current.id || !current.urls) return;

  isLoading.set(true);
  error.set(null);

  try {
    // Optimistic update - apply immediately for instant UI feedback
    const currentUrls = current.urls as unknown as UrlItem[];
    let updatedUrls: UrlItem[];

    if (optimisticUpdate) {
      // Use custom optimistic updater if provided
      updatedUrls = optimisticUpdate(currentUrls);
    } else {
      // Default optimistic update
      updatedUrls = currentUrls.map((url) =>
        url.id === urlId
          ? { ...url, ...updates, updatedAt: new Date().toISOString() }
          : url
      );
    }

    // Update store immediately (optimistic)
    currentList.set({ ...current, urls: updatedUrls });

    // Use unified PATCH endpoint that handles update, activity, and real-time updates
    // Pass existingMetadata if available (from prefetch cache) to avoid redundant fetch
    const response = await fetch(`/api/lists/${current.id}/urls`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urlId,
        updates,
        metadata: existingMetadata, // Pass cached metadata if available
      }),
    });

    if (!response.ok) throw new Error("Failed to update URL");

    const {
      list,
      url: serverUrl,
      metadata: urlMetadata,
      activity: activityData,
    } = await response.json();

    // Merge server response with optimistic state
    // Server response is the source of truth, but preserve optimistic order
    const serverUrls = (list.urls as unknown as UrlItem[]) || [];
    const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));

    // For updates, use server data as source of truth for content
    // But preserve optimistic order (order of updatedUrls)
    const finalUrls = updatedUrls.map((url) => {
      if (url.id === urlId && serverUrl) {
        // Use server URL data (it has the latest content)
        return serverUrl as UrlItem;
      }
      const serverUrlData = serverUrlMap.get(url.id);
      if (serverUrlData) {
        // Server has the URL - use server data as source of truth for content
        // But preserve the optimistic order by mapping in the order of updatedUrls
        return serverUrlData;
      }
      return url; // Fallback (shouldn't happen)
    });

    // Also check for any URLs in server that aren't in optimistic (shouldn't happen, but safety check)
    const optimisticUrlIds = new Set(updatedUrls.map((u) => u.id));
    for (const serverUrlData of serverUrls) {
      if (!optimisticUrlIds.has(serverUrlData.id)) {
        finalUrls.push(serverUrlData);
      }
    }

    // Cache metadata if URL changed and metadata was provided
    if (typeof window !== "undefined" && urlMetadata && serverUrl?.url) {
      try {
        // Populate React Query cache SYNCHRONOUSLY so cards don't fetch
        // This prevents race condition where component checks cache before event handler runs
        const queryKey = ["url-metadata", serverUrl.url] as const;
        queryClient.setQueryData<UrlMetadata>(queryKey, urlMetadata);

        // Also dispatch event for components that listen to it (backward compatibility)
        window.dispatchEvent(
          new CustomEvent("metadata-cached", {
            detail: { url: serverUrl.url, metadata: urlMetadata },
          })
        );

        // Also save to localStorage
        const key = `react-query:${queryKey.join(":")}`;
        localStorage.setItem(
          key,
          JSON.stringify({ data: urlMetadata, timestamp: Date.now() })
        );
      } catch {
        // Ignore localStorage errors
      }
    }

    // Dispatch activity data for optimistic feed update
    // Use user data from activityData if available (from API response), otherwise fetch session
    if (typeof window !== "undefined" && activityData && current.id) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
          dispatchActivityEvents(current.id, {
            id: activityData.id,
            action: activityData.action,
            details: activityData.details,
            createdAt: activityData.createdAt,
            user: activityData.user,
          });
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              dispatchActivityEvents(current.id, {
                id: activityData.id,
                action: activityData.action,
                details: activityData.details,
                createdAt: activityData.createdAt,
                user: {
                  id: user.id,
                  email: user.email,
                },
              });
            }
          }
        }
      } catch {
        // Ignore errors - real-time event will handle it
      }
    }

    // Note: Activity feed will also update via real-time SSE event
    // But optimistic update provides instant feedback

    currentList.set({ ...list, urls: finalUrls });
    return { ...list, urls: finalUrls };
  } catch (err) {
    // Revert on error - fetch fresh data
    error.set(err instanceof Error ? err.message : "Failed to update list");
    if (current.slug) {
      await getList(current.slug);
    }
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function removeUrlFromList(urlId: string) {
  const current = currentList.get();
  if (!current.id || !current.urls) return;

  isLoading.set(true);
  error.set(null);

  try {
    const currentUrls = current.urls as unknown as UrlItem[];
    const updatedUrls = currentUrls.filter((url) => url.id !== urlId);

    // CRITICAL: Clear cache IMMEDIATELY before optimistic update
    // This prevents component render from seeing stale cache (7 URLs when server has 6)
    // Must happen BEFORE store update to ensure cache is clean when component renders
    // Preserves drag operations, HMR, and SSE by clearing only when URLs actually change
    if (updatedUrls.length !== currentUrls.length && current.id) {
      clearDragOrderCache(current.id);
    }

    // Optimistic update - remove immediately (no need to re-fetch metadata on delete)
    // We keep the existing URLs with their metadata, just remove the deleted one
    const deletedUrl = currentUrls.find((url) => url.id === urlId);

    // Update store immediately (optimistic)
    currentList.set({ ...current, urls: updatedUrls });

    // Use unified DELETE endpoint that handles delete, order update, activity, and real-time updates
    // Support both /urls/[urlId] and /urls?urlId= for backward compatibility
    const response = await fetch(
      `/api/lists/${current.id}/urls?urlId=${encodeURIComponent(urlId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    ).catch(() => {
      // Fallback to existing [urlId] endpoint if unified endpoint fails
      return fetch(`/api/lists/${current.id}/urls/${urlId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    });

    if (!response.ok) throw new Error("Failed to remove URL");

    const { list, activity } = await response.json();

    // Merge server response but preserve optimistic order (urls order is already correct)
    // Preserve current list metadata to avoid triggering unnecessary getList calls
    // Only update URLs from server response to prevent false change detection
    const serverUrls = (list.urls as unknown as UrlItem[]) || [];
    const currentListData = currentList.get();

    if (serverUrls.length === updatedUrls.length) {
      // Same count, just confirm with server data (merge any server-side updates)
      const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));
      const mergedUrls = updatedUrls.map((url) => {
        const serverUrl = serverUrlMap.get(url.id);
        return serverUrl ? { ...url, ...serverUrl } : url; // Merge server data but keep order
      });
      // Preserve ALL current list metadata to avoid false change detection in getList
      // Only update URLs and timestamp to prevent triggering unnecessary getList calls
      currentList.set({
        ...currentListData, // Preserve existing metadata (id, title, description, isPublic, collaborators, etc.)
        urls: mergedUrls, // Update URLs only
        updatedAt: list.updatedAt, // Update timestamp from server
      });
    } else {
      // Different count (unexpected), use server URLs but preserve all other metadata
      currentList.set({
        ...currentListData, // Preserve ALL existing metadata
        urls: serverUrls, // Use server URLs (unexpected scenario)
        updatedAt: list.updatedAt, // Update timestamp
      });
    }

    // Sync drag order cache with server state after URL delete
    // This ensures localStorage stays in sync with real-time updates (SSE)
    // Handles: URL delete, real-time updates, HMR/Fast Refresh
    if (current.id) {
      const finalUrls = currentList.get().urls as unknown as UrlItem[];
      syncDragOrderCacheWithServer(
        current.id,
        finalUrls || serverUrls,
        false // Allow update after delete operation completes
      );
    }

    // Dispatch activity events for optimistic feed update and refresh
    if (typeof window !== "undefined" && activity && current.id) {
      try {
        const sessionResponse = await fetch("/api/auth/session");
        if (sessionResponse.ok) {
          const { user } = await sessionResponse.json();
          if (user?.email) {
            dispatchActivityEvents(current.id, {
              id: activity.id,
              action: activity.action,
              details: activity.details,
              createdAt: activity.createdAt,
              user: {
                id: user.id,
                email: user.email,
              },
            });
          }
        }
      } catch {
        // Ignore errors - real-time event will handle it
      }
    }

    // Note: Activity feed will also update via real-time SSE event
    // But optimistic update provides instant feedback and activity-updated ensures refresh
  } catch (err) {
    // Revert on error
    error.set(err instanceof Error ? err.message : "Failed to update list");
    if (current.slug) {
      await getList(current.slug);
    }
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function toggleUrlFavorite(id: string) {
  const list = currentList.get() as UrlList | undefined;

  // Early return if list or urls don't exist
  if (!list?.id || !list?.urls) {
    return;
  }

  // Find the URL with type safety
  const urlIndex = list.urls.findIndex((url: UrlItem) => url.id === id);
  if (urlIndex === -1) {
    return;
  }

  // Get the current URL
  const url = list.urls[urlIndex];

  try {
    await updateUrlInList(id, { isFavorite: !url.isFavorite });
  } catch (err) {
    // Ignore errors
  }
}

export async function reorderUrls(startIndex: number, endIndex: number) {
  const current = currentList.get();
  if (!current.id || !current.urls) return;

  isLoading.set(true);
  error.set(null);

  try {
    const urls = [...current.urls];
    const [removed] = urls.splice(startIndex, 1);
    urls.splice(endIndex, 0, removed);

    // Use unified PATCH endpoint for reorder (same as drag operation)
    const response = await fetch(`/api/lists/${current.id}/urls`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls,
        action: "reorder",
      }),
    });

    if (!response.ok) throw new Error("Failed to reorder URLs");

    const { list, activity: activityData } = await response.json();

    // Preserve optimistic order (don't overwrite with server response)
    // Server response confirms the order, but we keep our optimistic state
    const optimisticUrls = current.urls as unknown as UrlItem[];
    const serverUrls = (list.urls as unknown as UrlItem[]) || [];
    const optimisticOrder = optimisticUrls.map((u) => u.id).join(",");
    const serverOrder = serverUrls.map((u) => u.id).join(",");

    if (optimisticOrder === serverOrder) {
      // Order matches, but update other fields from server (like timestamps)
      const mergedList = {
        ...list,
        urls: optimisticUrls, // Keep our optimistic order
      };
      currentList.set(mergedList);
    } else {
      // Use server order as source of truth if different
      currentList.set(list);
    }

    // Dispatch activity events for optimistic feed update and refresh
    if (typeof window !== "undefined" && activityData && current.id) {
      try {
        if (activityData.user?.email) {
          dispatchActivityEvents(current.id, {
            id: activityData.id,
            action: activityData.action,
            details: activityData.details,
            createdAt: activityData.createdAt,
            user: activityData.user,
          });
        }
      } catch {
        // Ignore event dispatch errors
      }
    }

    return currentList.get() as UrlList;
  } catch (err) {
    error.set(err instanceof Error ? err.message : "Failed to reorder URLs");
    return null;
  } finally {
    isLoading.set(false);
  }
}

export async function archiveUrlFromList(urlId: string) {
  const current = currentList.get();
  if (!current.id || !current.urls) return;

  isLoading.set(true);
  error.set(null);

  try {
    const currentUrls = current.urls as unknown as UrlItem[];
    // Find the URL to archive
    const urlToArchive = currentUrls.find((url) => url.id === urlId);
    if (!urlToArchive) throw new Error("URL not found");

    // Remove from active URLs
    const updatedUrls = currentUrls.filter((url) => url.id !== urlId);

    // Add to archived URLs with archived date
    const currentArchived = (current as UrlList).archivedUrls || [];
    const archivedUrl = {
      ...urlToArchive,
      archivedAt: new Date().toISOString(),
    } as UrlItem & { archivedAt: string };
    const updatedArchivedUrls = [...currentArchived, archivedUrl];

    // Optimistic update - update store immediately
    currentList.set({
      ...current,
      urls: updatedUrls,
      archivedUrls: updatedArchivedUrls,
    });

    // Use unified archive-url endpoint with action flag
    const response = await fetch(`/api/lists/${current.id}/archive-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: updatedUrls,
        archivedUrls: updatedArchivedUrls,
        action: "archive",
        urlId: urlId,
      }),
    });

    if (!response.ok) throw new Error("Failed to archive URL");

    const {
      list,
      activity: activityData,
      metadata: urlMetadata,
    } = await response.json();

    // Cache metadata if provided (for consistency)
    if (typeof window !== "undefined" && urlMetadata && urlToArchive.url) {
      try {
        const queryKey = ["url-metadata", urlToArchive.url] as const;
        queryClient.setQueryData<UrlMetadata>(queryKey, urlMetadata);

        // Also save to localStorage
        const key = `react-query:${queryKey.join(":")}`;
        localStorage.setItem(
          key,
          JSON.stringify({ data: urlMetadata, timestamp: Date.now() })
        );
      } catch {
        // Ignore localStorage errors
      }
    }

    // Dispatch activity data for optimistic feed update
    // Use user data from activityData if available (from API response), otherwise fetch session
    if (typeof window !== "undefined" && activityData && current.id) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
          dispatchActivityEvents(current.id, {
            id: activityData.id,
            action: activityData.action,
            details: activityData.details,
            createdAt: activityData.createdAt,
            user: activityData.user,
          });
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              dispatchActivityEvents(current.id, {
                id: activityData.id,
                action: activityData.action,
                details: activityData.details,
                createdAt: activityData.createdAt,
                user: {
                  id: user.id,
                  email: user.email,
                },
              });
            }
          }
        }
      } catch {
        // Ignore errors - real-time event will handle it
      }
    }

    // Note: Activity feed will also update via real-time SSE event
    // But optimistic update provides instant feedback

    currentList.set(list);
    return list;
  } catch (err) {
    error.set(err instanceof Error ? err.message : "Failed to archive URL");
    // Revert on error
    if (current.slug) {
      await getList(current.slug);
    }
    throw err;
  } finally {
    isLoading.set(false);
  }
}

export async function restoreArchivedUrl(urlId: string) {
  const current = currentList.get() as UrlList | undefined;
  if (!current?.id || !current?.archivedUrls) return;

  isLoading.set(true);
  error.set(null);

  try {
    // Find the archived URL
    const urlToRestore = current.archivedUrls.find((url) => url.id === urlId);
    if (!urlToRestore) throw new Error("Archived URL not found");

    // Remove from archived URLs
    const updatedArchivedUrls = current.archivedUrls.filter(
      (url: UrlItem) => url.id !== urlId
    );

    // Add back to active URLs (remove archivedAt field if it exists)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { archivedAt, ...restoredUrl } = urlToRestore as UrlItem & {
      archivedAt?: string;
    };
    const updatedUrls = [...(current.urls || []), restoredUrl];

    // Optimistic update - update store immediately
    currentList.set({
      ...current,
      urls: updatedUrls,
      archivedUrls: updatedArchivedUrls,
    });

    // Use unified archive-url endpoint with action flag
    const response = await fetch(`/api/lists/${current.id}/archive-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: updatedUrls,
        archivedUrls: updatedArchivedUrls,
        action: "restore",
        urlId: urlId,
      }),
    });

    if (!response.ok) throw new Error("Failed to restore URL");

    const {
      list,
      activity: activityData,
      metadata: urlMetadata,
    } = await response.json();

    // Cache metadata if provided (restored URLs need metadata cached)
    if (typeof window !== "undefined" && urlMetadata && restoredUrl.url) {
      try {
        const queryKey = ["url-metadata", restoredUrl.url] as const;
        queryClient.setQueryData<UrlMetadata>(queryKey, urlMetadata);

        // Also dispatch event for components that listen to it
        window.dispatchEvent(
          new CustomEvent("metadata-cached", {
            detail: { url: restoredUrl.url, metadata: urlMetadata },
          })
        );

        // Also save to localStorage
        const key = `react-query:${queryKey.join(":")}`;
        localStorage.setItem(
          key,
          JSON.stringify({ data: urlMetadata, timestamp: Date.now() })
        );
      } catch {
        // Ignore localStorage errors
      }
    }

    // Dispatch activity data for optimistic feed update
    // Use user data from activityData if available (from API response), otherwise fetch session
    if (typeof window !== "undefined" && activityData && current.id) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
          dispatchActivityEvents(current.id, {
            id: activityData.id,
            action: activityData.action,
            details: activityData.details,
            createdAt: activityData.createdAt,
            user: activityData.user,
          });
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              dispatchActivityEvents(current.id, {
                id: activityData.id,
                action: activityData.action,
                details: activityData.details,
                createdAt: activityData.createdAt,
                user: {
                  id: user.id,
                  email: user.email,
                },
              });
            }
          }
        }
      } catch {
        // Ignore errors - real-time event will handle it
      }
    }

    // Note: Activity feed will also update via real-time SSE event
    // But optimistic update provides instant feedback

    currentList.set(list);
    return list;
  } catch (err) {
    error.set(
      err instanceof Error ? err.message : "Failed to restore archived URL"
    );
  } finally {
    isLoading.set(false);
  }
}
