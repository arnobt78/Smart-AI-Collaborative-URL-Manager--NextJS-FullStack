/**
 * Centralized List State Management Hook
 * 
 * This hook provides a centralized way to manage list state with:
 * - Optimistic updates (immediate UI feedback)
 * - Automatic activity feed updates
 * - Real-time synchronization
 * - Proper React re-rendering
 */

import { useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { currentList, type UrlItem, type UrlList } from "@/stores/urlListStore";
import { flushSync } from "react-dom";

interface UseListStateOptions {
  onUpdate?: (list: UrlList) => void;
  onError?: (error: Error) => void;
}

/**
 * Centralized hook for managing list state with optimistic updates
 */
export function useListState(options: UseListStateOptions = {}) {
  const list = useStore(currentList);
  const isLocalOperationRef = useRef(false);
  const lastOperationTimeRef = useRef(0);

  /**
   * Update the store optimistically and trigger immediate re-render
   */
  const updateStoreOptimistically = useCallback(
    (updater: (current: Partial<UrlList>) => Partial<UrlList>) => {
      const current = currentList.get();
      const updated = updater(current);
      
      // Use flushSync to ensure React re-renders immediately
      if (typeof window !== "undefined") {
        flushSync(() => {
          currentList.set(updated);
        });
      } else {
        currentList.set(updated);
      }
      
      return updated;
    },
    []
  );

  /**
   * Update a URL in the list optimistically
   */
  const updateUrlOptimistically = useCallback(
    (urlId: string, updates: Partial<UrlItem>) => {
      return updateStoreOptimistically((current) => {
        if (!current.urls) return current;
        
        const updatedUrls = (current.urls as UrlItem[]).map((url) =>
          url.id === urlId
            ? { ...url, ...updates, updatedAt: new Date().toISOString() }
            : url
        );
        
        return { ...current, urls: updatedUrls };
      });
    },
    [updateStoreOptimistically]
  );

  /**
   * Reorder URLs optimistically
   */
  const reorderUrlsOptimistically = useCallback(
    (reorderedUrls: UrlItem[]) => {
      return updateStoreOptimistically((current) => ({
        ...current,
        urls: reorderedUrls,
      }));
    },
    [updateStoreOptimistically]
  );

  /**
   * Add URL optimistically
   */
  const addUrlOptimistically = useCallback(
    (newUrl: UrlItem) => {
      return updateStoreOptimistically((current) => {
        if (!current.urls) return current;
        return {
          ...current,
          urls: [...(current.urls as UrlItem[]), newUrl],
        };
      });
    },
    [updateStoreOptimistically]
  );

  /**
   * Remove URL optimistically
   */
  const removeUrlOptimistically = useCallback(
    (urlId: string) => {
      return updateStoreOptimistically((current) => {
        if (!current.urls) return current;
        return {
          ...current,
          urls: (current.urls as UrlItem[]).filter((url) => url.id !== urlId),
        };
      });
    },
    [updateStoreOptimistically]
  );

  /**
   * Sync with server response (merge server data with optimistic state)
   */
  const syncWithServer = useCallback(
    (serverList: UrlList, preserveOrder = false) => {
      const current = currentList.get();
      
      if (preserveOrder && current.urls) {
        // Preserve the current order (for drag operations)
        const currentUrls = current.urls as UrlItem[];
        const serverUrls = serverList.urls || [];
        
        // Create a map of server URLs by ID for quick lookup
        const serverUrlMap = new Map(
          serverUrls.map((url) => [url.id, url])
        );
        
        // Merge: use current order but update with server data
        const mergedUrls = currentUrls
          .map((url) => {
            const serverUrl = serverUrlMap.get(url.id);
            return serverUrl ? { ...serverUrl, ...url } : url;
          })
          .filter((url) => serverUrlMap.has(url.id)); // Remove URLs that don't exist on server
        
        // Add any new URLs from server that aren't in current order
        const currentIds = new Set(currentUrls.map((u) => u.id));
        serverUrls.forEach((url) => {
          if (!currentIds.has(url.id)) {
            mergedUrls.push(url);
          }
        });
        
        currentList.set({
          ...serverList,
          urls: mergedUrls,
        });
      } else {
        // Normal sync - use server data
        currentList.set(serverList);
      }
      
      options.onUpdate?.(serverList);
    },
    [options]
  );

  /**
   * Trigger activity feed update immediately
   */
  const triggerActivityUpdate = useCallback(() => {
    const now = Date.now();
    // Throttle to prevent excessive updates
    if (now - lastOperationTimeRef.current < 500) {
      return;
    }
    lastOperationTimeRef.current = now;
    
    // Dispatch event for activity feed
    window.dispatchEvent(
      new CustomEvent("activity-updated", {
        detail: { listId: list?.id },
      })
    );
  }, [list?.id]);

  /**
   * Mark operation as local (prevents real-time interference)
   */
  const startLocalOperation = useCallback(() => {
    isLocalOperationRef.current = true;
  }, []);

  /**
   * End local operation (allows real-time updates)
   */
  const endLocalOperation = useCallback(() => {
    // Delay to allow API call to complete
    setTimeout(() => {
      isLocalOperationRef.current = false;
    }, 1000);
  }, []);

  /**
   * Check if a local operation is in progress
   */
  const isLocalOperation = useCallback(() => {
    return isLocalOperationRef.current;
  }, []);

  return {
    list: list as UrlList | null,
    updateStoreOptimistically,
    updateUrlOptimistically,
    reorderUrlsOptimistically,
    addUrlOptimistically,
    removeUrlOptimistically,
    syncWithServer,
    triggerActivityUpdate,
    startLocalOperation,
    endLocalOperation,
    isLocalOperation,
  };
}

