"use client";

import { usePrefetchUserData } from "@/hooks/usePrefetchUserData";

/**
 * Component that prefetches user data - add this to root layout
 * Separated from the hook file to prevent Fast Refresh issues
 */
export function UserDataPrefetcher() {
  usePrefetchUserData();
  return null; // This component doesn't render anything
}

