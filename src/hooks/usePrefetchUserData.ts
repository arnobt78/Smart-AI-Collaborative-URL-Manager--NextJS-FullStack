"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { listQueryKeys } from "./useListQueries";
import { currentList } from "@/stores/urlListStore";

/**
 * Hook that prefetches all user-related data when user is authenticated
 * This ensures all pages load instantly with cached data
 */
export function usePrefetchUserData() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, refetch: refetchSession } = useSession();

  // Listen for session updates (after login/signup)
  useEffect(() => {
    const handleSessionUpdate = () => {
      // Refetch session to update auth state
      refetchSession();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("session-updated", handleSessionUpdate);
      return () => {
        window.removeEventListener("session-updated", handleSessionUpdate);
      };
    }
  }, [refetchSession]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Prefetch all user lists and their complete data (URLs, activities, collaborators)
    // This populates the cache so ALL pages load instantly
    const prefetchAllUserData = async () => {
      try {
        // Step 1: Prefetch all user lists
        await queryClient.prefetchQuery({
          queryKey: listQueryKeys.allLists(),
          queryFn: async () => {
            const response = await fetch("/api/lists");
            if (!response.ok) {
              if (response.status === 401) {
                throw new Error("Unauthorized");
              }
              throw new Error(`Failed to fetch lists: ${response.status}`);
            }
            const data = await response.json();
            return { lists: data.lists || [] };
          },
          staleTime: 30 * 1000, // 30 seconds
        });

        // Step 2: Get the prefetched lists data from cache
        const listsData = queryClient.getQueryData<{ lists: Array<{ id: string; slug: string }> }>(
          listQueryKeys.allLists()
        );
        const lists = listsData?.lists || [];

        if (lists.length === 0) {
          return; // No lists to prefetch
        }

        // Step 3: Prefetch unified data for FIRST 3 lists only (list + activities + collaborators)
        // This makes navigating to commonly accessed lists instant without overwhelming the server
        // Other lists will be fetched on-demand when user navigates to them
        const listsToPrefetch = lists.slice(0, 3); // Only prefetch first 3 lists
        const prefetchPromises = listsToPrefetch.map((list) => {
          if (!list.slug) return Promise.resolve();

          return queryClient
            .prefetchQuery({
              queryKey: listQueryKeys.unified(list.slug),
              queryFn: async () => {
                try {
                  const response = await fetch(
                    `/api/lists/${list.slug}/updates?activityLimit=30`
                  );
                  if (!response.ok) {
                    if (response.status === 401) {
                      return { list: null, activities: [], collaborators: [] };
                    }
                    throw new Error(`Failed to fetch: ${response.status}`);
                  }
                  const data = await response.json();

                  // Update list store (for consistency with unified query behavior)
                  if (data.list) {
                    currentList.set(data.list);
                  }

                  // Populate React Query cache for collaborators if available
                  if (data.list?.id && data.collaborators) {
                    queryClient.setQueryData(
                      listQueryKeys.collaborators(data.list.id),
                      { collaborators: data.collaborators }
                    );
                  }

                  // Dispatch events for components that listen (for consistency)
                  if (data.list?.id && typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("unified-activities-updated", {
                        detail: {
                          listId: data.list.id,
                          activities: data.activities || [],
                        },
                      })
                    );

                    window.dispatchEvent(
                      new CustomEvent("unified-collaborators-updated", {
                        detail: {
                          listId: data.list.id,
                          collaborators: data.collaborators || [],
                        },
                      })
                    );
                  }

                  return {
                    list: data.list || null,
                    activities: data.activities || [],
                    collaborators: data.collaborators || [],
                  };
                } catch (error) {
                  // Return empty data on error - not critical for prefetch
                  return { list: null, activities: [], collaborators: [] };
                }
              },
              staleTime: 30 * 1000, // 30 seconds
            })
            .catch(() => {
              // Silently fail individual prefetches - not critical
            });
        });

        // Wait for all prefetches to complete (in parallel for speed)
        await Promise.allSettled(prefetchPromises);
      } catch (error) {
        // Silently fail prefetch - not critical
      }
    };

    // Prefetch immediately when user is authenticated
    // REMOVED: Aggressive interval prefetching - it was causing duplicate API calls
    // React Query's cache and SSE events are sufficient for keeping data fresh
    prefetchAllUserData();
  }, [isAuthenticated, user?.id, queryClient]);
}

/**
 * Component that prefetches user data - add this to root layout
 */
export function UserDataPrefetcher() {
  usePrefetchUserData();
  return null; // This component doesn't render anything
}

