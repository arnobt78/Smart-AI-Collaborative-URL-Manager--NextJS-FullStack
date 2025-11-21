/**
 * Centralized drag order cache management
 * Handles localStorage and global cache synchronization with server state
 * Supports: URL add/delete, drag operations, HMR, SSE real-time updates
 */

import type { UrlItem } from "./urlListStore";

interface CacheValidationResult {
  isValid: boolean;
  reason?: "length_mismatch" | "ids_mismatch" | "valid" | "empty_list";
  storedCount: number;
  serverCount: number;
}

/**
 * Get the storage key for drag order cache
 */
export function getDragOrderStorageKey(listId: string): string {
  return `drag-order:${listId}`;
}

/**
 * Validate if cached drag order matches server state
 */
export function validateDragOrderCache(
  cachedUrls: UrlItem[],
  serverUrls: UrlItem[]
): CacheValidationResult {
  // Empty list - cache is invalid
  if (serverUrls.length === 0) {
    return {
      isValid: false,
      reason: "empty_list",
      storedCount: cachedUrls.length,
      serverCount: 0,
    };
  }

  // Length mismatch - cache is invalid
  if (cachedUrls.length !== serverUrls.length) {
    return {
      isValid: false,
      reason: "length_mismatch",
      storedCount: cachedUrls.length,
      serverCount: serverUrls.length,
    };
  }

  // Check if IDs match
  const cachedIds = new Set(cachedUrls.map((u) => u.id));
  const serverIds = new Set(serverUrls.map((u) => u.id));
  const sameIds =
    cachedIds.size === serverIds.size &&
    [...cachedIds].every((id) => serverIds.has(id));

  if (!sameIds) {
    return {
      isValid: false,
      reason: "ids_mismatch",
      storedCount: cachedUrls.length,
      serverCount: serverUrls.length,
    };
  }

  // Cache is valid - IDs and length match
  return {
    isValid: true,
    reason: "valid",
    storedCount: cachedUrls.length,
    serverCount: serverUrls.length,
  };
}

/**
 * Clear drag order cache for a list
 */
export function clearDragOrderCache(listId: string): void {
  if (typeof window === "undefined") return;

  try {
    const storageKey = getDragOrderStorageKey(listId);

    // Clear localStorage
    localStorage.removeItem(storageKey);

    // Clear global cache
    const globalCache = (window as any).__dragOrderCache;
    if (globalCache && globalCache[storageKey]) {
      delete globalCache[storageKey];
    }

    // console.log("🧹 [CACHE] Cleared drag order cache", {
    //   listId,
    //   storageKey,
    // });
  } catch (error) {
    // Ignore errors - not critical
    // console.debug("Failed to clear drag order cache", error);
  }
}

/**
 * Update drag order cache with new URLs
 * Only updates if data is valid and not during drag operations
 */
export function updateDragOrderCache(
  listId: string,
  urls: UrlItem[],
  skipIfDragInProgress: boolean = false
): boolean {
  if (typeof window === "undefined") return false;

  // Skip if drag is in progress (unless forced)
  if (skipIfDragInProgress) {
    const globalCache = (window as any).__dragOrderCache;
    const storageKey = getDragOrderStorageKey(listId);
    if (globalCache && globalCache[storageKey]) {
      // Drag in progress - don't update
      return false;
    }
  }

  try {
    const storageKey = getDragOrderStorageKey(listId);

    // Update localStorage
    const storageValue = JSON.stringify(urls);
    localStorage.setItem(storageKey, storageValue);

    // Update global cache
    const globalCache = (window as any).__dragOrderCache || {};
    globalCache[storageKey] = urls;
    (window as any).__dragOrderCache = globalCache;

    return true;
  } catch (error) {
    // console.debug("Failed to update drag order cache", error);
    return false;
  }
}

/**
 * Sync drag order cache with server state
 * Clears if stale, updates if valid
 * Called after URL add/delete operations and real-time updates
 */
export function syncDragOrderCacheWithServer(
  listId: string,
  serverUrls: UrlItem[],
  skipIfDragInProgress: boolean = true
): { cleared: boolean; updated: boolean } {
  if (typeof window === "undefined") {
    return { cleared: false, updated: false };
  }

  try {
    const storageKey = getDragOrderStorageKey(listId);
    const stored = localStorage.getItem(storageKey);

    // No cache exists - nothing to sync
    if (!stored) {
      // If server has URLs and no cache exists, we can optionally create cache
      // But only if not during drag (would interfere with drag operations)
      if (serverUrls.length > 0 && !skipIfDragInProgress) {
        updateDragOrderCache(listId, serverUrls, false);
        return { cleared: false, updated: true };
      }
      return { cleared: false, updated: false };
    }

    // Parse cached data
    const cachedUrls = JSON.parse(stored) as UrlItem[];

    // Validate cache against server state
    const validation = validateDragOrderCache(cachedUrls, serverUrls);

    if (!validation.isValid) {
      // Cache is stale - clear it
      clearDragOrderCache(listId);
      return { cleared: true, updated: false };
    }

    // Cache is valid - optionally update with server order if different
    // (Preserves user's drag order if same IDs, but updates from server if order changed externally)
    const cachedOrder = cachedUrls.map((u) => u.id).join(",");
    const serverOrder = serverUrls.map((u) => u.id).join(",");

    // Only update if order changed (but IDs are same - this means external reorder via SSE)
    // Don't update if drag might be in progress
    if (cachedOrder !== serverOrder && !skipIfDragInProgress) {
      updateDragOrderCache(listId, serverUrls, false);
      return { cleared: false, updated: true };
    }

    // Cache is valid and up-to-date
    return { cleared: false, updated: false };
  } catch (error) {
    // console.error("Failed to sync drag order cache", error);
    return { cleared: false, updated: false };
  }
}

/**
 * Get cached drag order if valid
 */
export function getCachedDragOrder(
  listId: string,
  serverUrls: UrlItem[]
): UrlItem[] | null {
  if (typeof window === "undefined") return null;

  try {
    const storageKey = getDragOrderStorageKey(listId);

    // First check global cache (faster, survives Fast Refresh)
    const globalCache = (window as any).__dragOrderCache;
    if (globalCache && globalCache[storageKey]) {
      const cached = globalCache[storageKey] as UrlItem[];
      const validation = validateDragOrderCache(cached, serverUrls);
      if (validation.isValid) {
        return cached;
      }
    }

    // Then check localStorage
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const cached = JSON.parse(stored) as UrlItem[];
    const validation = validateDragOrderCache(cached, serverUrls);

    if (validation.isValid) {
      // Also restore to global cache
      if (!globalCache) {
        (window as any).__dragOrderCache = {};
      }
      (window as any).__dragOrderCache[storageKey] = cached;
      return cached;
    }

    // Cache is invalid - clear it
    clearDragOrderCache(listId);
    return null;
  } catch (error) {
    // console.debug("Failed to get cached drag order", error);
    return null;
  }
}

