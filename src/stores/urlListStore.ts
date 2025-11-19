import { atom, map } from "nanostores";
import { queryClient } from "@/lib/react-query";
import type { UrlMetadata } from "@/utils/urlMetadata";

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
  collaborators?: string[]; // user emails or ids
}

// Initialize with empty list state
export const currentList = map<Partial<UrlList>>({});
export const isLoading = atom<boolean>(false);
export const error = atom<string | null>(null);

// Global flag to prevent getList from overwriting optimistic updates during drag
// This is set by the component during drag operations
let isDragInProgress = false;

export function setDragInProgress(value: boolean) {
  isDragInProgress = value;
}

export async function getList(slug: string, skipIfDragInProgress = false) {
  // Skip if drag is in progress and we're asked to respect it
  if (skipIfDragInProgress && isDragInProgress) {
    const current = currentList.get();
    return current as UrlList | null;
  }
  isLoading.set(true);
  error.set(null);

  try {
    const response = await fetch(`/api/lists/${slug}`);
    if (!response.ok) throw new Error("Failed to fetch list");

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

    const metadataChanged =
      idChanged ||
      titleChanged ||
      descriptionChanged ||
      isPublicChanged ||
      collaboratorsChanged;

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
      let preservedOrder: UrlItem[] | null = null;
      if (typeof window !== "undefined" && list?.id) {
        try {
          const storageKey = `drag-order:${list.id}`;

          // FIRST: Check global cache (survives Fast Refresh better)
          const globalCache = (window as any).__dragOrderCache;
          if (globalCache && globalCache[storageKey]) {
            preservedOrder = globalCache[storageKey];
            if (preservedOrder) {
              console.log("✅ [STORE] Found preserved order in global cache", {
                listId: list.id,
                order: preservedOrder.map((u) => u.id),
              });
            }
          }

          // THEN: Check localStorage (backup if global cache missing)
          const stored = localStorage.getItem(storageKey);

          // CRITICAL: Also verify by reading again to ensure it's not a stale read
          const verifyStored = localStorage.getItem(storageKey);

          console.log("🔍 [STORE] getList checking localStorage", {
            listId: list.id,
            hasGlobalCache: !!preservedOrder,
            hasStored: !!stored,
            hasVerifyStored: !!verifyStored,
            storedMatchesVerify: stored === verifyStored,
            storedLength: stored?.length,
            verifyLength: verifyStored?.length,
            currentEmpty: !current,
            currentId: current?.id,
          });

          // Use localStorage if global cache didn't have it
          if (!preservedOrder && stored) {
            const parsed = JSON.parse(stored) as UrlItem[];
            // Use newUrls from server response for comparison (they're the latest)
            if (parsed.length === newUrls.length) {
              const storedIds = new Set(parsed.map((u) => u.id));
              const serverIds = new Set(newUrls.map((u) => u.id));
              const sameIds =
                storedIds.size === serverIds.size &&
                [...storedIds].every((id) => serverIds.has(id));

              if (sameIds) {
                preservedOrder = parsed;
                console.log(
                  "✅ [STORE] Found preserved order in localStorage",
                  {
                    preserved: parsed.map((u) => u.id),
                    server: newUrls.map((u) => u.id),
                  }
                );
              } else {
                console.log(
                  "⚠️ [STORE] Preserved order has different URLs, ignoring",
                  {
                    preserved: parsed.map((u) => u.id),
                    server: newUrls.map((u) => u.id),
                  }
                );
              }
            } else {
              console.log(
                "⚠️ [STORE] Preserved order has different length, ignoring",
                {
                  preservedLength: parsed.length,
                  serverLength: newUrls.length,
                }
              );
            }
          } else {
            console.log("⏭️ [STORE] No preserved order in localStorage");
          }
        } catch (err) {
          console.error(
            "❌ [STORE] Failed to read localStorage in getList",
            err
          );
        }
      } else {
        console.log(
          "⏭️ [STORE] Cannot check localStorage - missing list.id or window",
          {
            hasListId: !!list?.id,
            hasWindow: typeof window !== "undefined",
          }
        );
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
        const mergedList = {
          ...list,
          urls: orderToUse, // Keep optimistic/sessionStorage order - user's action takes precedence
        };
        console.log("🔄 [STORE] Preserving drag order (only order changed)", {
          preserved: orderToUse.map((u) => u.id),
          server: newUrls.map((u) => u.id),
        });
        currentList.set(mergedList);
        return currentList.get() as UrlList; // Return the preserved state
      } else if (preservedOrder) {
        // Even if URLs changed, if we have preserved order, use it (drag in progress)
        const mergedList = {
          ...list,
          urls: preservedOrder,
        };
        console.log("🔄 [STORE] Preserving drag order (drag in progress)", {
          preserved: preservedOrder.map((u) => u.id),
          server: newUrls.map((u) => u.id),
        });
        currentList.set(mergedList);
        return currentList.get() as UrlList;
      } else {
        // Normal update - URLs were added/removed/changed OR metadata changed
        // BUT: Check if current store has a different order than server (possible drag in progress)
        // If so, preserve current order if it's a reorder (same URLs, just different order)
        if (
          !urlsLengthChanged &&
          !urlsContentChanged &&
          urlsOrderChanged &&
          currentUrls.length > 0 &&
          newUrls.length > 0
        ) {
          // This is a reorder - preserve current order (user's action) over server order
          const currentIds = new Set(currentUrls.map((u) => u.id));
          const serverIds = new Set(newUrls.map((u) => u.id));
          const sameIds =
            currentIds.size === serverIds.size &&
            [...currentIds].every((id) => serverIds.has(id));

          if (sameIds) {
            // Same URLs, just different order - preserve current (user's drag order)
            const mergedList = {
              ...list,
              urls: currentUrls, // Keep current order - user's action takes precedence
            };
            console.log(
              "🔄 [STORE] Preserving current order (reorder detected)",
              {
                current: currentUrls.map((u) => u.id),
                server: newUrls.map((u) => u.id),
                note: "User's drag order preserved over server order",
              }
            );
            currentList.set(mergedList);
            return currentList.get() as UrlList;
          }
        }

        // Normal update - URLs were added/removed/changed OR metadata changed
        // Always update from server for content/metadata changes (especially for cross-window updates)
        console.log("🔄 [STORE] Using server order (normal update)", {
          server: newUrls.map((u) => u.id),
          current: currentUrls.map((u) => u.id),
        });
        currentList.set(list);
      }
    }
    return (currentList.get() as UrlList) || list;
  } catch (err) {
    error.set(err instanceof Error ? err.message : "Failed to fetch list");
    return null;
  } finally {
    isLoading.set(false);
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
  isDuplicate?: boolean // Optional flag to indicate this is a duplicate operation
) {
  const current = currentList.get();
  if (!current.id || !current.urls) return;

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

    // Optimistic update - add immediately
    currentList.set({ ...current, urls: updatedUrls });

    // Use unified POST endpoint that handles add, metadata fetching, activity, and real-time updates
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
    if (typeof window !== "undefined" && activityData) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
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
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              // Dispatch activity with user email for optimistic update
              window.dispatchEvent(
                new CustomEvent("activity-added", {
                  detail: {
                    listId: current.id,
                    activity: {
                      id: activityData.id,
                      action: activityData.action,
                      details: activityData.details,
                      createdAt: activityData.createdAt,
                      user: {
                        id: user.id,
                        email: user.email,
                      },
                    },
                  },
                })
              );
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
    if (typeof window !== "undefined" && activityData) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
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
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              window.dispatchEvent(
                new CustomEvent("activity-added", {
                  detail: {
                    listId: current.id,
                    activity: {
                      id: activityData.id,
                      action: activityData.action,
                      details: activityData.details,
                      createdAt: activityData.createdAt,
                      user: {
                        id: user.id,
                        email: user.email,
                      },
                    },
                  },
                })
              );
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

    // Dispatch activity data for optimistic feed update
    if (typeof window !== "undefined" && activity) {
      try {
        const sessionResponse = await fetch("/api/auth/session");
        if (sessionResponse.ok) {
          const { user } = await sessionResponse.json();
          if (user?.email) {
            window.dispatchEvent(
              new CustomEvent("activity-added", {
                detail: {
                  listId: current.id,
                  activity: {
                    id: activity.id,
                    action: activity.action,
                    details: activity.details,
                    createdAt: activity.createdAt,
                    user: {
                      id: user.id,
                      email: user.email,
                    },
                  },
                },
              })
            );
          }
        }
      } catch {
        // Ignore errors - real-time event will handle it
      }
    }

    // Note: Activity feed will also update via real-time SSE event
    // But optimistic update provides instant feedback
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

    // Dispatch activity-added event for optimistic feed update
    if (typeof window !== "undefined" && activityData) {
      try {
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
    if (typeof window !== "undefined" && activityData) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
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
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              window.dispatchEvent(
                new CustomEvent("activity-added", {
                  detail: {
                    listId: current.id,
                    activity: {
                      id: activityData.id,
                      action: activityData.action,
                      details: activityData.details,
                      createdAt: activityData.createdAt,
                      user: {
                        id: user.id,
                        email: user.email,
                      },
                    },
                  },
                })
              );
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
    if (typeof window !== "undefined" && activityData) {
      try {
        // If activityData already has user data (from API response), use it directly
        if (activityData.user?.email) {
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
        } else {
          // Fallback: fetch session if user data not in response (backward compatibility)
          const sessionResponse = await fetch("/api/auth/session");
          if (sessionResponse.ok) {
            const { user } = await sessionResponse.json();
            if (user?.email) {
              window.dispatchEvent(
                new CustomEvent("activity-added", {
                  detail: {
                    listId: current.id,
                    activity: {
                      id: activityData.id,
                      action: activityData.action,
                      details: activityData.details,
                      createdAt: activityData.createdAt,
                      user: {
                        id: user.id,
                        email: user.email,
                      },
                    },
                  },
                })
              );
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
