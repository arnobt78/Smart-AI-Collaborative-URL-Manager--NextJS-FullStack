import { atom, map } from "nanostores";

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
    console.log("⏭️ [GETLIST] Skipping getList - drag in progress");
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

    // Debug logging for metadata changes
    if (isPublicChanged) {
      console.log(
        `🔍 [GETLIST] isPublic changed: ${current?.isPublic} → ${list?.isPublic}`
      );
    }

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
      // If ONLY order changed (same URLs, same content, just reordered), preserve optimistic order
      // This prevents server refreshes from overwriting drag operations
      if (
        urlsOrderChanged &&
        !urlsLengthChanged &&
        !urlsContentChanged &&
        !metadataChanged &&
        currentUrls.length > 0
      ) {
        // This is ONLY a reorder - preserve the current (optimistic) order
        console.log(
          "⏭️ [GETLIST] Reorder detected, preserving user's current order (not overwriting drag)"
        );
        const mergedList = {
          ...list,
          urls: currentUrls, // Keep optimistic order - user's action takes precedence
        };
        currentList.set(mergedList);
        return currentList.get() as UrlList; // Return the preserved state
      } else {
        // Normal update - URLs were added/removed/changed OR metadata changed
        // Always update from server for content/metadata changes (especially for cross-window updates)
        console.log(
          "✅ [GETLIST] Update detected (content/metadata changed), updating from server"
        );
        console.log(`   - Metadata changed: ${metadataChanged}`);
        console.log(`   - URLs length changed: ${urlsLengthChanged}`);
        console.log(`   - URLs order changed: ${urlsOrderChanged}`);
        console.log(`   - URLs content changed: ${urlsContentChanged}`);
        currentList.set(list);
      }
    } else {
      // No change detected - don't update
      console.log("⏭️ [GETLIST] No changes detected, skipping update");
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
  category?: string
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

    // Then sync with server
    const response = await fetch(`/api/lists/${current.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: updatedUrls, action: "url_added" }),
    });

    if (!response.ok) throw new Error("Failed to add URL");

    const { list } = await response.json();

    // Trigger activity feed update AFTER API call completes (activity is now in DB)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("activity-updated", {
          detail: { listId: current.id },
        })
      );
      
      // Invalidate metadata cache when URL is added
      fetch(`/api/lists/${current.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: false }),
      }).catch(() => {
        // Silently fail - cache invalidation is non-critical
      });
    }

    // Merge server response (server might have added metadata)
    const serverUrls = (list.urls as unknown as UrlItem[]) || [];
    const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));

    // Update optimistic URLs with server data
    const finalUrls = updatedUrls.map((url) => {
      const serverUrl = serverUrlMap.get(url.id);
      return serverUrl ? { ...url, ...serverUrl } : url;
    });

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
  optimisticUpdate?: (urls: UrlItem[]) => UrlItem[]
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

    // Then sync with server
    const response = await fetch(`/api/lists/${current.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: updatedUrls, action: "url_updated" }),
    });

    if (!response.ok) throw new Error("Failed to update URL");

    const { list } = await response.json();

    // Trigger activity feed update AFTER API call completes (activity is now in DB)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("activity-updated", {
          detail: { listId: current.id },
        })
      );
      
      // Invalidate metadata cache when URL is updated
      fetch(`/api/lists/${current.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: false }),
      }).catch(() => {
        // Silently fail - cache invalidation is non-critical
      });
    }

    // Merge server response with optimistic state
    // Server response is the source of truth, but preserve optimistic order if it's just a reorder
    const serverUrls = (list.urls as unknown as UrlItem[]) || [];
    const serverUrlMap = new Map(serverUrls.map((u) => [u.id, u]));

    // For updates (not reorders), use server data as source of truth for content
    // But preserve optimistic order (order of updatedUrls)
    const finalUrls = updatedUrls.map((url) => {
      const serverUrl = serverUrlMap.get(url.id);
      if (serverUrl) {
        // Server has the URL - use server data as source of truth for content
        // But preserve the optimistic order by mapping in the order of updatedUrls
        return serverUrl; // Use server data directly (it has the latest content)
      }
      return url; // Fallback (shouldn't happen)
    });

    // Also check for any URLs in server that aren't in optimistic (shouldn't happen, but safety check)
    const optimisticUrlIds = new Set(updatedUrls.map((u) => u.id));
    for (const serverUrl of serverUrls) {
      if (!optimisticUrlIds.has(serverUrl.id)) {
        finalUrls.push(serverUrl);
      }
    }

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

    // Optimistic update - remove immediately
    currentList.set({ ...current, urls: updatedUrls });

    // Then sync with server
    const response = await fetch(`/api/lists/${current.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: updatedUrls, action: "url_deleted" }),
    });

    if (!response.ok) throw new Error("Failed to remove URL");

    const { list } = await response.json();
    currentList.set(list);

    // Trigger activity feed update AFTER API call completes (activity is now in DB)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("activity-updated", {
          detail: { listId: current.id },
        })
      );
      
      // Invalidate metadata cache when URL is removed
      fetch(`/api/lists/${current.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: false }),
      }).catch(() => {
        // Silently fail - cache invalidation is non-critical
      });
    }
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
    console.warn("No list or URLs found");
    return;
  }

  // Find the URL with type safety
  const urlIndex = list.urls.findIndex((url: UrlItem) => url.id === id);
  if (urlIndex === -1) {
    console.warn("URL not found");
    return;
  }

  // Get the current URL
  const url = list.urls[urlIndex];

  try {
    await updateUrlInList(id, { isFavorite: !url.isFavorite });
  } catch (err) {
    console.error("Error toggling favorite:", err);
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

    const response = await fetch(`/api/lists/${current.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, action: "url_reordered" }),
    });

    if (!response.ok) throw new Error("Failed to reorder URLs");

    const { list } = await response.json();
    currentList.set(list);
    return list;
  } catch (err) {
    error.set(err instanceof Error ? err.message : "Failed to reorder URLs");
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

    // Update both urls and archivedUrls
    const response = await fetch(`/api/lists/${current.id}/archive-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: updatedUrls,
        archivedUrls: updatedArchivedUrls,
      }),
    });

    if (!response.ok) throw new Error("Failed to archive URL");

    const { list } = await response.json();
    currentList.set(list);

    // Trigger activity feed update AFTER API call completes (activity is now in DB)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("activity-updated", {
          detail: { listId: current.id },
        })
      );
      
      // Invalidate metadata cache when URL is archived
      fetch(`/api/lists/${current.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: false }),
      }).catch(() => {
        // Silently fail - cache invalidation is non-critical
      });
    }

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

    // Update both urls and archivedUrls
    const response = await fetch(`/api/lists/${current.id}/archive-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: updatedUrls,
        archivedUrls: updatedArchivedUrls,
      }),
    });

    if (!response.ok) throw new Error("Failed to restore URL");

    const { list } = await response.json();
    currentList.set(list);
    
    // Invalidate metadata cache when URL is restored
    if (typeof window !== "undefined") {
      fetch(`/api/lists/${current.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: false }),
      }).catch(() => {
        // Silently fail - cache invalidation is non-critical
      });
    }
    
    return list;
  } catch (err) {
    error.set(
      err instanceof Error ? err.message : "Failed to restore archived URL"
    );
  } finally {
    isLoading.set(false);
  }
}
