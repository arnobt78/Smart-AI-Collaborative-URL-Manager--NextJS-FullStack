"use client";

import { useQuery } from "@tanstack/react-query";

interface SessionUser {
  id: string;
  email: string;
}

interface SessionResponse {
  user: SessionUser | null;
}

/**
 * Shared hook to get current session with caching
 * Uses React Query to cache the session and prevent duplicate fetches
 */
export function useSession() {
  const { data, isLoading, error, refetch } = useQuery<SessionResponse>({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/session");
      if (!response.ok) {
        throw new Error("Failed to fetch session");
      }
      return response.json();
    },
    // CRITICAL: Cache forever until invalidated (after login/logout)
    // With staleTime: Infinity, data never becomes stale automatically
    // Only becomes stale when manually invalidated (login/logout), then refetches once
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache after component unmounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    // CRITICAL: Refetch only when stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    // Normal usage uses cache instantly (no API calls)
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect (use cache, invalidate on login/logout instead)
    // CRITICAL: Use stale data immediately if available, fetch fresh in background
    placeholderData: (previousData) => previousData, // Keep previous data visible while refetching
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
    refetch,
  };
}

