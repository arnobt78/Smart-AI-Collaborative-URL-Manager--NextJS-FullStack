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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    refetchOnReconnect: true, // Refetch on reconnect
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
    refetch,
  };
}

