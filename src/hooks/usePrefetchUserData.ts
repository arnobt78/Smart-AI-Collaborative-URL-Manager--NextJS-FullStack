"use client";

import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";

/**
 * Hook that handles session updates for prefetching
 * DISABLED: Aggressive prefetching causes duplicate API calls and performance issues
 * Pages now fetch data on-demand which is faster and more efficient
 */
export function usePrefetchUserData() {
  const { refetch: refetchSession } = useSession();

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

  // DISABLED: Prefetching unified data causes duplicate API calls
  // Pages will fetch data on-demand using React Query's cache
  // This is actually faster because:
  // 1. No unnecessary prefetch calls on every page load
  // 2. React Query deduplicates requests automatically
  // 3. Cache is shared across components, so first fetch benefits all
}

