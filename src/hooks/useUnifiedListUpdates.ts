"use client";

import { useCallback, useRef, useEffect } from "react";
import { currentList } from "@/stores/urlListStore";
import type { UrlList } from "@/stores/urlListStore";

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

interface UnifiedUpdateResponse {
  list: UrlList;
  activities: ActivityItem[];
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
    }> => {
      // Global lock: Prevent duplicate fetches across all components
      const now = Date.now();
      if (globalIsFetching) {
        console.log("⏭️ [UNIFIED] Global fetch already in progress, skipping...");
        return { list: null, activities: [] };
      }

      // Debounce: Only fetch if at least 200ms since last global fetch
      if (now - globalLastFetch < 200) {
        console.log(`⏭️ [UNIFIED] Too soon since last fetch (${now - globalLastFetch}ms), skipping...`);
        return { list: null, activities: [] };
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
            return { list: null, activities: [] };
          }
          // For other errors, throw normally
          throw new Error(
            `Failed to fetch unified updates: ${response.status}`
          );
        }

        const data: UnifiedUpdateResponse = await response.json();
        console.log(`✅ [UNIFIED] Fetched list + ${data.activities.length} activities`);

        // Update list store
        if (data.list) {
          currentList.set(data.list);
        }

        // Dispatch activities to ActivityFeed component
        window.dispatchEvent(
          new CustomEvent("unified-activities-updated", {
            detail: {
              listId,
              activities: data.activities,
            },
          })
        );

        return {
          list: data.list || null,
          activities: data.activities || [],
        };
      } catch (error) {
        // Only log non-401 errors (401 is handled above and returned silently)
        if (!(error instanceof Error && error.message.includes("401"))) {
          console.error("❌ [UNIFIED] Failed to fetch updates:", error);
        }
        return { list: null, activities: [] };
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

