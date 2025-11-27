"use client";

import { useCallback, useRef, useEffect } from "react";
import { currentList } from "@/stores/urlListStore";
import type { UrlList } from "@/stores/urlListStore";
import { queryClient } from "@/lib/react-query";

interface ActivityItem {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
}

interface Collaborator {
  email: string;
  role: "editor" | "viewer";
}

interface UnifiedUpdateResponse {
  list: UrlList;
  activities: ActivityItem[];
  collaborators?: Collaborator[]; // Optional - included when available
  urlOrder: string;
  clickCounts: Array<{ urlId: string; clickCount: number }>;
}

// Global lock to prevent multiple simultaneous unified fetches
let globalIsFetching = false;
let globalLastFetch = 0;

/**
 * UNIFIED HOOK: Fetches both list and activities in a single API call
 * This ensures consistency and eliminates duplicate API calls
 * Both UrlList and ActivityFeed use this hook, but only ONE fetch happens globally
 */
export function useUnifiedListUpdates(listId: string) {
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchRef = useRef<number>(0);

  const fetchUnifiedUpdates = useCallback(
    async (
      slug: string,
      activityLimit: number = 30
    ): Promise<{
      list: UrlList | null;
      activities: ActivityItem[];
      collaborators?: Collaborator[];
    }> => {
      // Global lock: Prevent duplicate fetches across all components
      const now = Date.now();
      if (globalIsFetching) {
        console.log("⏭️ [UNIFIED] Global fetch already in progress, skipping...");
        return { list: null, activities: [], collaborators: [] };
      }

      // Debounce: Only fetch if at least 200ms since last global fetch
      if (now - globalLastFetch < 200) {
        console.log(`⏭️ [UNIFIED] Too soon since last fetch (${now - globalLastFetch}ms), skipping...`);
        return { list: null, activities: [], collaborators: [] };
      }

      // Set global lock
      globalIsFetching = true;
      globalLastFetch = now;
      isFetchingRef.current = true;
      lastFetchRef.current = now;

      try {
        console.log(`🔄 [UNIFIED] Fetching unified updates for ${slug}...`);
        const response = await fetch(
          `/api/lists/${slug}/updates?activityLimit=${activityLimit}`
        );

        if (!response.ok) {
          // If 401 Unauthorized, dispatch a special event so ListPage can handle redirect
          // Don't throw error for 401 - it's expected when user loses access
          if (response.status === 401) {
            window.dispatchEvent(
              new CustomEvent("unified-update-unauthorized", {
                detail: { listId, slug },
              })
            );
            // Return empty result without throwing - 401 is expected when removed
            return { list: null, activities: [], collaborators: [] };
          }
          // For other errors, throw normally
          throw new Error(
            `Failed to fetch unified updates: ${response.status}`
          );
        }

        const data: UnifiedUpdateResponse = await response.json();
        console.log(`✅ [UNIFIED] Fetched list + ${data.activities.length} activities${data.collaborators ? ` + ${data.collaborators.length} collaborators` : ''}`);

        // Update list store
        if (data.list) {
          currentList.set(data.list);
        }

        // Use actual list ID from response (more reliable than hook parameter)
        const actualListId = data.list?.id || listId;

        // Dispatch activities to ActivityFeed component
        window.dispatchEvent(
          new CustomEvent("unified-activities-updated", {
            detail: {
              listId: actualListId,
              activities: data.activities,
            },
          })
        );

        // Dispatch collaborators to PermissionManager component (always dispatch, even if empty array)
        // This prevents PermissionManager from making a separate API call
        // Empty array [] is still valid data - it means "no collaborators"
        const collaboratorsData = data.collaborators || [];
        console.log(`📤 [UNIFIED] Dispatching unified-collaborators-updated event for listId: ${actualListId}, collaborators: ${collaboratorsData.length}`);
        
        // CRITICAL: Populate React Query cache DIRECTLY so PermissionManager finds it even if component isn't mounted yet
        // This ensures cache is available immediately when PermissionManager checks on mount (before 1500ms delay expires)
        queryClient.setQueryData<{ collaborators: Collaborator[] }>(
          [`collaborators:${actualListId}`],
          { collaborators: collaboratorsData }
        );
        console.log(`💾 [UNIFIED] Populated React Query cache for listId: ${actualListId} with ${collaboratorsData.length} collaborators`);
        
        // Dispatch event for PermissionManager component listener (catches it if already mounted)
        window.dispatchEvent(
          new CustomEvent("unified-collaborators-updated", {
            detail: {
              listId: actualListId,
              collaborators: collaboratorsData,
            },
          })
        );

        return {
          list: data.list || null,
          activities: data.activities || [],
          collaborators: data.collaborators || [],
        };
      } catch (error) {
        // Handle expected errors silently (no error overlay):
        // - 401 Unauthorized (already handled above)
        // - NetworkError/AbortError (page refresh during bulk import)
        // - Request aborted (normal during page transitions)
        const isExpectedError =
          (error instanceof Error && error.message.includes("401")) ||
          (error instanceof Error && 
            (error.name === "NetworkError" ||
             error.name === "AbortError" ||
             error.message.includes("aborted") ||
             error.message.includes("fetch")));
        
        if (!isExpectedError) {
          // Only log unexpected errors
          console.error("❌ [UNIFIED] Failed to fetch updates:", error);
        } else if (process.env.NODE_ENV === "development") {
          // Silently handle expected errors (no console spam)
          console.debug("⏭️ [UNIFIED] Fetch aborted (expected during page refresh/bulk import)");
        }
        return { list: null, activities: [], collaborators: [] };
      } finally {
        // Clear global lock after a short delay
        setTimeout(() => {
          globalIsFetching = false;
          isFetchingRef.current = false;
        }, 100);
      }
    },
    [listId]
  );

  return { fetchUnifiedUpdates };
}

