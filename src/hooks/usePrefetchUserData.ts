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
        const listsResult = await queryClient.prefetchQuery({
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

        if (process.env.NODE_ENV === "development") {
          console.log("✅ [PREFETCH] User lists prefetched successfully");
        }

        // Step 2: Get the prefetched lists data
        const listsData = await listsResult;
        const lists = listsData?.lists || [];

        if (lists.length === 0) {
          return; // No lists to prefetch
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`🔄 [PREFETCH] Prefetching unified data for ${lists.length} lists...`);
        }

        // Step 3: Prefetch unified data for ALL lists (list + activities + collaborators)
        // This makes navigating to any list instant - all data is already cached
        const prefetchPromises = lists.map((list) => {
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
                  if (process.env.NODE_ENV === "development") {
                    console.debug(
                      `⏭️ [PREFETCH] Failed to prefetch list ${list.slug}:`,
                      error
                    );
                  }
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

        if (process.env.NODE_ENV === "development") {
          console.log(
            `✅ [PREFETCH] Completed prefetching unified data for ${lists.length} lists`
          );
          console.log(
            `📊 [PREFETCH] All user data cached - pages will load instantly!`
          );
        }
      } catch (error) {
        // Silently fail prefetch - not critical
        if (process.env.NODE_ENV === "development") {
          console.debug("⏭️ [PREFETCH] Failed to prefetch user data:", error);
        }
      }
    };

    // Prefetch immediately when user is authenticated
    prefetchAllUserData();

    // Also set up interval to keep data fresh (every 60 seconds)
    const interval = setInterval(() => {
      if (isAuthenticated) {
        prefetchAllUserData();
      }
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.id, queryClient]);
}

/**
 * Component that prefetches user data - add this to root layout
 */
export function UserDataPrefetcher() {
  usePrefetchUserData();
  return null; // This component doesn't render anything
}

