"use client";

import { useQuery } from "@tanstack/react-query";
import { browseQueryKeys } from "@/lib/browse-query-keys";

export { browseQueryKeys } from "@/lib/browse-query-keys";

// ============================================
// QUERY KEYS - Browse & Public Lists
// ============================================
// ============================================
// PUBLIC LISTS QUERY
// ============================================
interface PublicList {
  id: string;
  slug: string;
  title: string;
  description?: string;
  urls: Array<{
    id: string;
    url: string;
    title?: string;
  }>;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
  };
}

interface PublicListsResponse {
  lists: PublicList[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  };
}

/**
 * Fetch public lists with pagination and search
 * CRITICAL: Cache forever until invalidated - public lists don't change often
 */
export function usePublicListsQuery(page: number, search?: string) {
  return useQuery<PublicListsResponse>({
    queryKey: browseQueryKeys.publicLists(page, search),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/lists/public?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch public lists: ${response.status}`);
      }
      const data = await response.json();
      return {
        lists: data.lists || [],
        pagination: data.pagination || {
          page,
          limit: 20,
          totalPages: 1,
          total: 0,
        },
      };
    },
    // CRITICAL: Cache forever until invalidated (public lists change rarely)
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts (matches default)
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    // CRITICAL: With staleTime: Infinity, refetchOnMount: true only refetches if data was invalidated
    // If data is fresh (not invalidated), it uses cache instantly (no API call)
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
    // CRITICAL: Use stale data immediately if available (shows cached data instantly)
    placeholderData: (previousData) => previousData, // Keep previous data visible while refetching
  });
}

// ============================================
// BUSINESS INSIGHTS QUERIES
// ============================================

interface OverviewData {
  totalLists: number;
  totalUrls: number;
  publicLists: number;
  privateLists: number;
  totalCollaborators: number;
  recentLists: number;
  recentUrls: number;
}

interface ActivityData {
  date: string;
  lists: number;
  urls: number;
}

interface PopularUrl {
  id: string;
  url: string;
  title?: string;
  listTitle: string;
  listSlug: string;
  isFavorite: boolean;
  clickCount?: number;
}

interface ActiveList {
  id: string;
  title: string;
  slug: string;
  urlCount: number;
  isPublic: boolean;
  collaborators: number;
}

interface PerformanceData {
  totalUrls: number;
  totalLists: number;
  avgUrlsPerList: number;
  publicCount: number;
  privateCount: number;
  listsWithCollaborators: number;
  topLists: Array<{
    slug: string;
    title: string;
    urlCount: number;
  }>;
}

interface GlobalStatsData {
  totalUsers: number;
  totalLists: number;
  totalUrls: number;
  liveUsersNow: number;
  publicLists: number;
  privateLists: number;
  listsWithCollaborators: number;
  avgUrlsPerList: number;
  newUsersLast7Days: number;
  newListsLast7Days: number;
  newUrlsLast7Days: number;
  userGrowthData: Array<{ date: string; users: number }>;
}

/**
 * Fetch business insights overview
 * CRITICAL: Cache forever - insights are computed aggregates that don't change frequently
 */
export function useBusinessOverviewQuery() {
  return useQuery<{ overview: OverviewData }>({
    queryKey: browseQueryKeys.businessInsights.overview(),
    queryFn: async () => {
      const response = await fetch("/api/business-insights/overview");
      if (!response.ok) {
        throw new Error(`Failed to fetch overview: ${response.status}`);
      }
      return response.json();
    },
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
    placeholderData: (previousData) => previousData, // Use cached data instantly
  });
}

/**
 * Fetch business activity data
 */
export function useBusinessActivityQuery(days: number = 30) {
  return useQuery<{ activity: ActivityData[] }>({
    queryKey: browseQueryKeys.businessInsights.activity(days),
    queryFn: async () => {
      const response = await fetch(
        `/api/business-insights/activity?days=${days}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch activity: ${response.status}`);
      }
      return response.json();
    },
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
    placeholderData: (previousData) => previousData, // Use cached data instantly
  });
}

/**
 * Fetch popular content
 * C6.8: `enabled` defers fetch until the Popular tab is selected.
 */
export function useBusinessPopularQuery(enabled = true) {
  return useQuery<{ popularUrls: PopularUrl[]; activeLists: ActiveList[] }>({
    queryKey: browseQueryKeys.businessInsights.popular(),
    queryFn: async () => {
      const response = await fetch("/api/business-insights/popular");
      if (!response.ok) {
        throw new Error(`Failed to fetch popular: ${response.status}`);
      }
      return response.json();
    },
    enabled,
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
    placeholderData: (previousData) => previousData, // Use cached data instantly
  });
}

/**
 * Fetch performance metrics
 * C6.8: `enabled` defers fetch until the Performance tab is selected.
 */
export function useBusinessPerformanceQuery(enabled = true) {
  return useQuery<{ performance: PerformanceData }>({
    queryKey: browseQueryKeys.businessInsights.performance(),
    queryFn: async () => {
      const response = await fetch("/api/business-insights/performance");
      if (!response.ok) {
        throw new Error(`Failed to fetch performance: ${response.status}`);
      }
      return response.json();
    },
    enabled,
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
    placeholderData: (previousData) => previousData, // Use cached data instantly
  });
}

/**
 * Fetch global stats
 * C6.8: `enabled` defers fetch until the Global tab is selected.
 */
export function useBusinessGlobalQuery(enabled = true) {
  return useQuery<{ global: GlobalStatsData }>({
    queryKey: browseQueryKeys.businessInsights.global(),
    queryFn: async () => {
      const response = await fetch("/api/business-insights/global");
      if (!response.ok) {
        throw new Error(`Failed to fetch global: ${response.status}`);
      }
      return response.json();
    },
    enabled,
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
    placeholderData: (previousData) => previousData, // Use cached data instantly
  });
}

// ============================================
// API STATUS QUERY
// ============================================

interface ApiStatus {
  status: {
    overall: string;
    database: string;
    uptime: number;
    timestamp: string;
  };
  endpoints: Array<{
    name: string;
    endpoint: string;
    status: string;
    responseTime: number;
  }>;
}

/**
 * Fetch API status - polls every 30 seconds for real-time monitoring
 * NOTE: This uses refetchInterval for status monitoring - different from other queries
 */
export function useApiStatusQuery() {
  return useQuery<ApiStatus>({
    queryKey: browseQueryKeys.businessInsights.status(),
    queryFn: async () => {
      const response = await fetch("/api/business-insights/status");
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }
      return response.json();
    },
    // Status needs to be fresh, but still cache for instant display
    staleTime: 0, // Always consider stale for status monitoring
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    refetchOnMount: true,
    // CRITICAL: Poll every 30 seconds for real-time status updates
    refetchInterval: 30000, // 30 seconds - required for status monitoring
    retry: 1,
    placeholderData: (previousData) => previousData, // Show cached data while polling
  });
}
