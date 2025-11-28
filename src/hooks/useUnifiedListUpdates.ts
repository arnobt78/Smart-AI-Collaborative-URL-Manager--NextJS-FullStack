"use client";

import { useCallback, useRef, useEffect } from "react";
import { currentList } from "@/stores/urlListStore";
import type { UrlList } from "@/stores/urlListStore";
import { queryClient } from "@/lib/react-query";
import { listQueryKeys } from "./useListQueries";

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

// Singleton pattern: Store active fetch promises by (slug, activityLimit) key
// This ensures multiple components calling the same fetch share ONE actual API call
interface FetchKey {
  slug: string;
  activityLimit: number;
}

const activeFetches = new Map<string, Promise<{
  list: UrlList | null;
  activities: ActivityItem[];
  collaborators?: Collaborator[];
}>>();

// Global lock to prevent race conditions when multiple components call simultaneously
// Uses a Map to track in-progress fetches per key
const fetchLocks = new Map<string, boolean>();

// Helper to create fetch key
function getFetchKey(slug: string, activityLimit: number): string {
  return `${slug}:${activityLimit}`;
}

/**
 * UNIFIED HOOK: Fetches both list and activities in a single API call
 * Uses singleton pattern to ensure only ONE fetch happens even if multiple components call simultaneously
 * All components calling with the same (slug, activityLimit) will share the same promise
 */
export function useUnifiedListUpdates(listId: string) {
  const fetchUnifiedUpdates = useCallback(
    async (
      slug: string,
      activityLimit: number = 30
    ): Promise<{
      list: UrlList | null;
      activities: ActivityItem[];
      collaborators?: Collaborator[];
    }> => {
      const fetchKey = getFetchKey(slug, activityLimit);
      
      // CRITICAL: Synchronous check - no await here! Check for existing promise first
      const existingFetch = activeFetches.get(fetchKey);
      if (existingFetch) {
        if (process.env.NODE_ENV === "development") {
          console.log(`♻️ [UNIFIED] Reusing existing fetch for ${slug} (limit: ${activityLimit})`);
        }
        return existingFetch;
      }

      // Check if lock is already set (another component is creating the promise right now)
      if (fetchLocks.get(fetchKey)) {
        // Lock is set, poll synchronously until promise is stored (max 100ms)
        let attempts = 0;
        while (attempts < 50) { // 50 * 2ms = 100ms max wait
          const waitingFetch = activeFetches.get(fetchKey);
          if (waitingFetch) {
            if (process.env.NODE_ENV === "development") {
              console.log(`♻️ [UNIFIED] Found fetch created by another component for ${slug} (limit: ${activityLimit})`);
            }
            return waitingFetch;
          }
          // Small synchronous delay (simulate with Promise.resolve().then() pattern)
          await new Promise(resolve => setTimeout(resolve, 2));
          attempts++;
        }
        // If we waited 100ms and still no promise, something is wrong - check one more time
        const finalFetch = activeFetches.get(fetchKey);
        if (finalFetch) {
          return finalFetch;
        }
      }

      // Set lock IMMEDIATELY (synchronous) to prevent other components from starting
      fetchLocks.set(fetchKey, true);

      // Create the actual fetch promise
      const fetchPromise = (async () => {
        try {
          console.log(`🔄 [UNIFIED] Starting new fetch for ${slug} (limit: ${activityLimit})...`);
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
          if (process.env.NODE_ENV === "development") {
            console.log(`✅ [UNIFIED] Fetched list + ${data.activities.length} activities${data.collaborators ? ` + ${data.collaborators.length} collaborators` : ''}`);
          }

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
            if (process.env.NODE_ENV === "development") {
              console.log(`📤 [UNIFIED] Dispatching unified-collaborators-updated event for listId: ${actualListId}, collaborators: ${collaboratorsData.length}`);
            }
          
          // CRITICAL: Populate React Query cache DIRECTLY so PermissionManager finds it even if component isn't mounted yet
          // This ensures cache is available immediately when PermissionManager checks on mount (before 1500ms delay expires)
          queryClient.setQueryData<{ collaborators: Collaborator[] }>(
            listQueryKeys.collaborators(actualListId),
            { collaborators: collaboratorsData }
          );
            if (process.env.NODE_ENV === "development") {
              console.log(`💾 [UNIFIED] Populated React Query cache for listId: ${actualListId} with ${collaboratorsData.length} collaborators`);
            }
          
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
          // Remove from active fetches map and lock when done (success or error)
          activeFetches.delete(fetchKey);
          fetchLocks.delete(fetchKey); // CRITICAL: Release lock so future fetches can happen
        }
      })();

      // Store the promise in the map IMMEDIATELY (synchronously) so other components find it
      // This must happen before any await, so the promise is in the map before async operations
      activeFetches.set(fetchKey, fetchPromise);
      
      return fetchPromise;
    },
    [listId]
  );

  return { fetchUnifiedUpdates };
}

