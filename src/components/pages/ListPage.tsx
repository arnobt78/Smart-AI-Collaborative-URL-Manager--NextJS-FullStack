"use client";

import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { UrlList } from "@/components/lists/UrlList";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import {
  Copy,
  Check,
  Globe,
  Lock,
  UserPlus,
  Mail,
  Activity,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { InputDialog } from "@/components/ui/InputDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";
import { PermissionManager } from "@/components/collaboration/PermissionManager";
import { SmartCollections } from "@/components/collections/SmartCollections";
import { useListPermissions } from "@/hooks/useListPermissions";
import { useSession } from "@/hooks/useSession";
import {
  useUnifiedListQuery,
  setupSSECacheSync,
  listQueryKeys,
} from "@/hooks/useListQueries";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBrowseQueries, invalidateListQueries } from "@/utils/queryInvalidation";

export default function ListPageClient() {
  const { toast } = useToast();
  const router = useRouter();
  const { slug } = useParams();
  const { user: sessionUser, isLoading: sessionLoading, isAuthenticated } = useSession();
  const list = useStore(currentList);
  const permissions = useListPermissions(); // Get permissions for current list and user
  const listSlug = typeof slug === "string" ? slug : "";
  const queryClient = useQueryClient();

  // Setup SSE cache sync for React Query
  useEffect(() => {
    return setupSSECacheSync();
  }, []);

  // Use React Query for unified list data
  const {
    data: unifiedData,
    isLoading: isLoadingQuery,
    refetch,
  } = useUnifiedListQuery(listSlug, !!listSlug && !sessionLoading);

  // CRITICAL: Start with loading=false to show cached data immediately
  // Only show loading if we truly have no data
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false); // Track if component is mounted (prevents hydration errors)
  const [isCopied, setIsCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  // inviteDialogOpen removed - PermissionManager handles dialogs internally
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);
  const hasSyncedVectors = useRef<string | null>(null); // Track which list ID we've synced (in-memory)
  const syncInProgress = useRef<string | null>(null); // Track if sync is currently in progress for a list
  const hasFetchedRef = useRef<string | null>(null);
  const hasRedirectedRef = useRef<boolean>(false); // Track if we've already redirected to prevent duplicate redirects
  const hasCheckedAuthRef = useRef<boolean>(false); // Track if we've checked authentication to prevent duplicate redirects

  // CRITICAL: Set mounted state after component mounts (prevents hydration errors)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check localStorage and sessionStorage for persistent vector sync status
  // Uses both localStorage (persists across sessions) and sessionStorage (persists in current session)
  // This provides redundancy in case localStorage is cleared (e.g., by Fast Refresh in development)
  const hasListSyncedVectors = (listId: string): boolean => {
    if (typeof window === "undefined") return false;
    
    // Check localStorage (persists across sessions)
    const localSyncedLists = JSON.parse(
      localStorage.getItem("vector-synced-lists") || "[]"
    );
    if (localSyncedLists.includes(listId)) {
      return true;
    }
    
    // Check sessionStorage as backup (persists in current session, survives Fast Refresh better)
    const sessionSyncedLists = JSON.parse(
      sessionStorage.getItem("vector-synced-lists") || "[]"
    );
    return sessionSyncedLists.includes(listId);
  };

  // Mark list as vector synced in both localStorage and sessionStorage
  const markListVectorSynced = (listId: string) => {
    if (typeof window === "undefined") return;
    
    // Mark in localStorage (persists across sessions)
    const localSyncedLists = JSON.parse(
      localStorage.getItem("vector-synced-lists") || "[]"
    );
    if (!localSyncedLists.includes(listId)) {
      localSyncedLists.push(listId);
      // Keep only last 100 lists to prevent localStorage bloat
      const trimmed = localSyncedLists.slice(-100);
      localStorage.setItem("vector-synced-lists", JSON.stringify(trimmed));
    }
    
    // Also mark in sessionStorage as backup (survives Fast Refresh better)
    const sessionSyncedLists = JSON.parse(
      sessionStorage.getItem("vector-synced-lists") || "[]"
    );
    if (!sessionSyncedLists.includes(listId)) {
      sessionSyncedLists.push(listId);
      // Keep only last 100 lists to prevent sessionStorage bloat
      const trimmed = sessionSyncedLists.slice(-100);
      sessionStorage.setItem("vector-synced-lists", JSON.stringify(trimmed));
    }
  };

  // CRITICAL: Check authentication and redirect to login if user is not logged in
  // This handles the case where a collaborator clicks an invitation link without being logged in
  // Show skeleton while checking, then redirect if user is not authenticated and query failed with 401
  // This prevents flicker by showing skeleton instead of list content before redirect
  useEffect(() => {
    // Don't check if we've already redirected or are still loading session
    if (hasCheckedAuthRef.current || sessionLoading || hasRedirectedRef.current || !mounted) {
      return;
    }

    // Wait for query to complete before checking (public lists allow unauthenticated access)
    // But show skeleton during this time to prevent flicker
    if (isLoadingQuery) {
      return;
    }

    // Check if user is not authenticated and list query returned null (401 unauthorized)
    // This indicates the user needs to log in to access the list
    // Note: Public lists will return data even for unauthenticated users, so we only redirect on 401
    if (
      !isAuthenticated &&
      !unifiedData?.list &&
      !list?.id &&
      listSlug &&
      typeof window !== "undefined"
    ) {
      hasCheckedAuthRef.current = true;
      hasRedirectedRef.current = true;

      // Store current URL in sessionStorage for redirect after login
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem("authRedirect", currentPath);

      // Show toast notification
      toast({
        title: "Login Required",
        description: "You need to be logged in to view this list. Please sign in to continue.",
        variant: "info",
        duration: 5000,
      });

      // Redirect to login page immediately (no delay to prevent flicker)
      router.push("/");
    } else {
      // User is authenticated or list is available (including public lists for unauthenticated users)
      hasCheckedAuthRef.current = true;
    }
  }, [
    isAuthenticated,
    sessionLoading,
    unifiedData,
    list,
    listSlug,
    isLoadingQuery,
    router,
    toast,
    mounted,
  ]);

  // Update loading state - only show loading if we truly have NO data at all
  useEffect(() => {
    // If we have data (from React Query or store), we're not loading
    if (
      unifiedData?.list?.slug === listSlug ||
      (list && list.slug === listSlug && list.id)
    ) {
      setIsLoading(false);
      return;
    }

    // Only show loading if we have a slug but absolutely no data yet
    // And React Query is actively fetching (not just checking cache)
    // Also show loading if session is loading (waiting for authentication check)
    if (
      listSlug &&
      ((isLoadingQuery && !unifiedData && !list?.id) || sessionLoading)
    ) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [unifiedData, isLoadingQuery, listSlug, list, slug, sessionLoading]);

  // Track current permissions with a ref to check in callbacks
  const permissionsRef = useRef(permissions);
  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  // Track recent collaborator_removed events to handle 401 errors
  const recentCollaboratorRemovedRef = useRef<{
    email: string;
    ownerEmail: string;
    timestamp: number;
  } | null>(null);

  // Listen for collaborator removal and redirect if current user is removed
  // Only trigger if user currently has access (not on initial load or stale events)
  useEffect(() => {
    if (
      !sessionUser?.email ||
      !list?.id ||
      hasRedirectedRef.current ||
      isLoading
    ) {
      return;
    }

    // Don't set up listener if user doesn't have access (initial load, they were never added, etc.)
    if (permissions.role === "none") {
      return;
    }

    const handleUnifiedUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        action?: string;
        activity?: {
          action?: string;
          details?: {
            collaboratorEmail?: string;
          };
          user?: {
            email?: string;
          };
        };
      }>;

      // Only handle collaborator_removed actions for this list
      if (
        customEvent.detail?.listId === list.id &&
        customEvent.detail?.action === "collaborator_removed"
      ) {
        const activity = customEvent.detail?.activity;
        const removedEmail = activity?.details?.collaboratorEmail;
        const ownerEmail = activity?.user?.email;

        // Check if the removed collaborator is the current user
        if (
          removedEmail &&
          removedEmail.toLowerCase() === sessionUser.email.toLowerCase()
        ) {
          // Store this event info for 401 handling
          recentCollaboratorRemovedRef.current = {
            email: removedEmail,
            ownerEmail: ownerEmail || "the owner",
            timestamp: Date.now(),
          };

          // Prevent duplicate redirects
          if (hasRedirectedRef.current) {
            return;
          }

          // Wait for unified endpoint to update permissions, then verify they lost access
          setTimeout(() => {
            // Check current permissions (from ref, which updates via useEffect above)
            const currentRole = permissionsRef.current.role;

            // Only redirect if they actually lost access
            if (currentRole === "none" && !hasRedirectedRef.current) {
              handleRedirect(ownerEmail || "the owner");
            }
          }, 800); // Delay to allow unified endpoint to update permissions
        }
      }
    };

    // Handle 401 Unauthorized from unified endpoint (indicates access was removed)
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        slug?: string;
      }>;

      // Check if this is for our list and we have a recent collaborator_removed event
      if (
        customEvent.detail?.listId === list.id &&
        recentCollaboratorRemovedRef.current &&
        Date.now() - recentCollaboratorRemovedRef.current.timestamp < 5000 // Within last 5 seconds
      ) {
        const removedInfo = recentCollaboratorRemovedRef.current;

        // Verify this is for the current user
        if (
          removedInfo.email.toLowerCase() === sessionUser.email.toLowerCase()
        ) {
          // 401 + recent collaborator_removed event = user was definitely removed
          if (!hasRedirectedRef.current) {
            handleRedirect(removedInfo.ownerEmail);
          }
        }
      }
    };

    const handleRedirect = (ownerEmail: string) => {
      hasRedirectedRef.current = true;

      // Get list name
      const listName = list.title || "this list";

      // Show toast with list name and owner email
      toast({
        title: "Access Removed",
        description: `You have been removed from "${listName}" by ${ownerEmail}.`,
        variant: "error",
        duration: 5000,
      });

      // Redirect to home page after a short delay to show the toast
      setTimeout(() => {
        router.push("/");
      }, 500);
    };

    window.addEventListener("unified-update", handleUnifiedUpdate);
    window.addEventListener("unified-update-unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("unified-update", handleUnifiedUpdate);
      window.removeEventListener(
        "unified-update-unauthorized",
        handleUnauthorized
      );
    };
  }, [
    list?.id,
    list?.title,
    sessionUser?.email,
    router,
    toast,
    isLoading,
    permissions.role,
  ]);

  // Auto-sync vectors for existing URLs when list loads (background, non-blocking)
  useEffect(() => {
    if (!list?.id || !list.urls || list.urls.length === 0) {
      return;
    }

    const listId = list.id; // Store in const to avoid stale closure issues

    // DEBUG: Log localStorage and sessionStorage check for vector sync debugging
    if (process.env.NODE_ENV === "development") {
      const isSynced = hasListSyncedVectors(listId);
      const localSyncedLists = typeof window !== "undefined" 
        ? JSON.parse(localStorage.getItem("vector-synced-lists") || "[]")
        : [];
      const sessionSyncedLists = typeof window !== "undefined" 
        ? JSON.parse(sessionStorage.getItem("vector-synced-lists") || "[]")
        : [];
      console.log(`🔍 [VECTOR DEBUG] List ${listId}:`, {
        isSynced,
        localSyncedLists,
        sessionSyncedLists,
        hasInMemoryRef: hasSyncedVectors.current === listId,
        inMemoryRef: hasSyncedVectors.current,
        syncInProgress: syncInProgress.current === listId,
      });
    }

    // CRITICAL: Check localStorage IMMEDIATELY when component mounts (not after delay)
    // This ensures we skip sync on second visit even before the timeout runs
    if (hasListSyncedVectors(listId)) {
      hasSyncedVectors.current = listId; // Update ref for in-memory check
      if (process.env.NODE_ENV === "development") {
        console.log(`⏭️ [VECTOR] ✅ SKIPPING sync for list ${listId} - already synced (localStorage check passed)`);
      }
      return; // Already synced - skip entirely
    }

    // Also check in-memory ref (for same session)
    if (hasSyncedVectors.current === listId) {
      if (process.env.NODE_ENV === "development") {
        console.log(`⏭️ [VECTOR] ✅ SKIPPING sync for list ${listId} - already synced (in-memory check passed)`);
      }
      return; // Already synced in this session
    }

    // Check if sync is already in progress for this list
    if (syncInProgress.current === listId) {
      if (process.env.NODE_ENV === "development") {
        console.log(`⏭️ [VECTOR] ✅ SKIPPING sync for list ${listId} - sync already in progress`);
      }
      return; // Sync already in progress
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`🔄 [VECTOR] Will sync list ${listId} - not found in localStorage or in-memory ref`);
    }

    async function syncVectors() {
      // Double-check conditions before syncing
      if (!list?.id || !list.urls || list.urls.length === 0) {
        syncInProgress.current = null; // Clear progress flag
        return;
      }

      // Mark sync as in progress immediately to prevent duplicate syncs
      syncInProgress.current = listId;

      // Mark in-memory ref immediately to prevent duplicate syncs in same session
      hasSyncedVectors.current = listId;

      // CRITICAL: Mark as synced in localStorage IMMEDIATELY (optimistic) BEFORE fetch
      // This prevents duplicate syncs on second visit even if user navigates away quickly
      // The localStorage is set synchronously and persists across page visits
      if (process.env.NODE_ENV === "development") {
        console.log(`📝 [VECTOR] Marking list ${listId} as synced in localStorage (optimistic, before API call)`);
      }
      markListVectorSynced(listId);

      // DEBUG: Verify localStorage was set correctly
      if (process.env.NODE_ENV === "development") {
        const verifySynced = hasListSyncedVectors(listId);
        const syncedLists = typeof window !== "undefined" 
          ? JSON.parse(localStorage.getItem("vector-synced-lists") || "[]")
          : [];
        console.log(`📝 [VECTOR DEBUG] Marked list ${listId} as synced:`, {
          verifySynced,
          syncedLists,
        });
      }

      // Double-check localStorage was set correctly (defensive check)
      if (!hasListSyncedVectors(listId)) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`⚠️ [VECTOR] Failed to persist sync status for list ${listId}`);
        }
        // If localStorage failed, we'll still try to sync, but mark again after success
      }

      // Sync vectors in background (don't block UI)
      if (process.env.NODE_ENV === "development") {
        console.log(`🚀 [VECTOR] Starting API call to sync vectors for list ${listId}`);
      }
      fetch(`/api/lists/${listId}/sync-vectors`, {
        method: "POST",
      })
        .then(() => {
          // Sync succeeded - localStorage already marked optimistically
          // Double-check it's still marked (defensive)
          if (!hasListSyncedVectors(listId)) {
            if (process.env.NODE_ENV === "development") {
              console.warn(`⚠️ [VECTOR] localStorage was cleared, re-marking list ${listId}`);
            }
            markListVectorSynced(listId);
          }

          if (process.env.NODE_ENV === "development") {
            const finalCheck = hasListSyncedVectors(listId);
            console.log(`✅ [VECTOR] Synced list ${listId} - localStorage check: ${finalCheck} - will not sync again`);
          }
          
          // Clear sync in progress flag
          syncInProgress.current = null;
        })
        .catch((error) => {
          // On failure, clear localStorage flag to allow retry on next visit
          if (typeof window !== "undefined") {
            const syncedLists = JSON.parse(
              localStorage.getItem("vector-synced-lists") || "[]"
            );
            const filtered = syncedLists.filter((id: string) => id !== listId);
            localStorage.setItem("vector-synced-lists", JSON.stringify(filtered));
          }

          // Reset refs so we can retry in same session
          hasSyncedVectors.current = null;
          syncInProgress.current = null;

          // Silently fail - vector sync is optional enhancement
          if (process.env.NODE_ENV === "development") {
            console.warn("Vector sync failed (non-critical):", error);
          }
        });
    }

    // Only sync once when list is loaded (after initial load)
    // Add a small delay to prevent immediate sync on every render
    const timeoutId = setTimeout(() => {
      if (list && !isLoading && list.id) {
        syncVectors();
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?.id]); // Only run when list ID changes

  // CRITICAL: Show skeleton immediately if:
  // 1. Session is loading (waiting for authentication check)
  // 2. User is not authenticated and query is still loading (waiting to confirm 401)
  // 3. No data available and query is loading
  // This prevents flicker by showing skeleton before redirect happens
  const hasAnyData =
    unifiedData?.list?.id || (list && list.id && list.slug === listSlug);
  
  // Show skeleton if session is loading OR if not authenticated and query is still loading
  // This prevents showing list content before redirect happens
  const shouldShowLoading = 
    !mounted || // Not mounted yet (prevent hydration mismatch)
    sessionLoading || // Session is loading (waiting for auth check)
    (!isAuthenticated && isLoadingQuery && !hasAnyData && listSlug) || // Not authenticated and query loading (likely 401)
    (!hasAnyData && isLoadingQuery && listSlug); // No data and query loading

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen w-full">
        {/* Header Card Skeleton */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
          {/* First Row: Title/Info on Left, Buttons on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Left Side: Title, URL Count, Visibility Badge, Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
              {/* Title Skeleton */}
              <Skeleton className="h-6 sm:h-7 md:h-8 w-48 sm:w-64" />

              {/* URL Count Badge Skeleton */}
              <Skeleton className="h-5 w-16 rounded-full" />

              {/* Visibility Badge Skeleton */}
              <Skeleton className="h-5 w-20 sm:w-32 rounded-full" />

              {/* Private/Public Toggle Skeleton */}
              <div className="flex flex-col items-center">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-3 w-12 mt-1" />
              </div>
            </div>

            {/* Right Side: Setup Schedule and Health Check Buttons Skeleton */}
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-7 w-28 rounded-lg" />
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          </div>

          {/* Second Row: Shareable Link Skeleton */}
          <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-32 sm:w-48 flex-1" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>

          {/* Collaborators Section Skeleton */}
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-11 w-44 rounded-xl" />
            </div>

            {/* Collaborator Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed Section Skeleton */}
          <div className="mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* URL List Skeleton */}
        <div className="space-y-6 mb-8">
          {/* Search and Sort Skeleton */}
          <div className="flex flex-col gap-2 mb-4 w-full sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-12 w-full sm:max-w-2xl" />
            <div className="flex flex-row flex-wrap gap-2 sm:flex-nowrap">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-28" />
            </div>
          </div>

          {/* Add URL Form Skeleton */}
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-white/20">
            <Skeleton className="h-12 w-full mb-3" />
            <Skeleton className="h-24 w-full mb-4" />
            <div className="flex justify-end gap-3">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* URL Cards Skeleton */}
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-6 w-28 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold">List not found</h1>
          <p className="mt-2 text-gray-600">
            The list you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button href="/" className="mt-8">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Header Card */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
        {/* First Row: Title/Info on Left, Buttons on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Left Side: Title, URL Count, Visibility Badge, Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
            {/* Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              {list.title || `List: ${list.slug}`}
            </h1>

            {/* URL Count Badge */}
            <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
              {list.urls?.length || 0}{" "}
              {list.urls?.length === 1 ? "URL" : "URLs"}
            </Badge>

            {/* Visibility Badge */}
            <Badge
              variant={list.isPublic ? "success" : "secondary"}
              className="text-xs sm:text-sm flex items-center gap-1 w-fit"
            >
              {list.isPublic ? (
                <>
                  <Globe className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    Public - Anyone can view
                  </span>
                  <span className="sm:hidden">Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    Private - Only you & collaborators
                  </span>
                  <span className="sm:hidden">Private</span>
                </>
              )}
            </Badge>

            {/* Private/Public Toggle - Disabled for viewers */}
            <div className="flex flex-col items-center">
              <Switch
                checked={list.isPublic ?? false}
                disabled={isToggling || !permissions.canInvite}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  setIsToggling(true);
                  try {
                    const response = await fetch(
                      `/api/lists/${list.id}/visibility`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPublic: newValue }),
                      }
                    );

                    if (response.ok) {
                      const { list: updatedList } = await response.json();
                      if (updatedList) {
                        flushSync(() => {
                          currentList.set(updatedList);
                        });

                        // CRITICAL: Invalidate ALL related queries to ensure all pages update immediately
                        // This ensures ListsPage, BrowsePage, and current page all update without refresh
                        // Use centralized invalidation function for consistency
                        if (typeof slug === "string" && list?.id) {
                          invalidateListQueries(queryClient, slug, list.id);
                        }
                        // CRITICAL: Invalidate browse/public lists queries so BrowsePage updates immediately
                        // This is additional to list queries invalidation above
                        invalidateBrowseQueries(queryClient);

                        // UNIFIED APPROACH: SSE handles ALL activity-updated events (single source of truth)
                        // No local dispatch needed - prevents duplicate API calls

                        toast({
                          title: newValue
                            ? "Made Public 🌐"
                            : "Made Private 🔒",
                          description: `List is now ${
                            newValue ? "public" : "private"
                          }`,
                          variant: "success",
                        });
                      } else {
                        // Refetch via React Query invalidation - triggers unified endpoint refetch
                        // Use centralized invalidation function for consistency
                        if (typeof slug === "string" && list?.id) {
                          invalidateListQueries(queryClient, slug, list.id);
                        }
                        // CRITICAL: Invalidate browse/public lists queries so BrowsePage updates immediately
                        // This is additional to list queries invalidation above
                        invalidateBrowseQueries(queryClient);
                        toast({
                          title: newValue
                            ? "Made Public 🌐"
                            : "Made Private 🔒",
                          description: `List is now ${
                            newValue ? "public" : "private"
                          }`,
                          variant: "success",
                        });
                      }
                    } else {
                      const data = await response.json();
                      toast({
                        title: "Failed",
                        description:
                          data.error || "Failed to update visibility",
                        variant: "error",
                      });
                    }
                  } catch {
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred",
                      variant: "error",
                    });
                  } finally {
                    setIsToggling(false);
                  }
                }}
              />
              <span className="text-[10px] text-white/50 mt-1">
                {list.isPublic ? "Public" : "Private"}
              </span>
            </div>
          </div>

          {/* Right Side: Setup Schedule and Health Check Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Setup Schedule Button */}
            <button
              type="button"
              onClick={async () => {
                setIsSettingUpSchedule(true);
                try {
                  const response = await fetch("/api/jobs/setup-schedule", {
                    method: "POST",
                  });

                  const data = await response.json();

                  if (response.ok) {
                    toast({
                      title: "Scheduled Jobs Setup Complete! ✅",
                      description:
                        "Daily health checks and weekly metadata refresh are now scheduled.",
                      variant: "success",
                    });
                  } else {
                    // Handle local development case
                    if (data.localDevelopment) {
                      toast({
                        title: "Local Development Detected",
                        description:
                          "Scheduled jobs require a public URL. Deploy to production or set up manually in QStash dashboard. Check console for details.",
                        variant: "info",
                      });
                      if (process.env.NODE_ENV === "development") {
                        console.log(
                          "📋 Manual Setup Instructions:",
                          data.instructions
                        );
                      }
                    } else {
                      toast({
                        title: "Setup Failed",
                        description:
                          data.error ||
                          data.message ||
                          "Failed to setup scheduled jobs",
                        variant: "error",
                      });
                    }
                  }
                } catch {
                  toast({
                    title: "Error",
                    description: "An unexpected error occurred",
                    variant: "error",
                  });
                } finally {
                  setIsSettingUpSchedule(false);
                }
              }}
              disabled={isSettingUpSchedule}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-white/90 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Setup scheduled jobs (daily health checks, weekly metadata refresh)"
            >
              <Activity
                className={`w-4 h-4 ${
                  isSettingUpSchedule ? "animate-spin" : ""
                }`}
              />
              <span>
                {isSettingUpSchedule ? "Setting up..." : "Setup Schedule"}
              </span>
            </button>
            {/* Refresh Metadata Button */}
            {list.urls && list.urls.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (!list.id) return;
                  setIsRefreshingMetadata(true);
                  try {
                    const response = await fetch("/api/jobs/refresh-metadata", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ listId: list.id }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                      // Clear React Query cache for all URLs to force re-fetch
                      if (list.urls && list.urls.length > 0) {
                        // Dispatch event to clear metadata cache
                        window.dispatchEvent(
                          new CustomEvent("metadata-refresh-complete", {
                            detail: { listId: list.id },
                          })
                        );
                      }

                      // Refetch via React Query invalidation - triggers unified endpoint refetch
                      if (typeof slug === "string") {
                        queryClient.invalidateQueries({
                          queryKey: listQueryKeys.unified(slug),
                        });
                      }

                      toast({
                        title: "Metadata Refresh Complete! ✅",
                        description: `Refreshed metadata for ${
                          data.refreshed || list.urls?.length || 0
                        } URLs using improved extractor.`,
                        variant: "success",
                      });
                    } else {
                      toast({
                        title: "Refresh Failed",
                        description: data.error || "Failed to refresh metadata",
                        variant: "error",
                      });
                    }
                  } catch {
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred",
                      variant: "error",
                    });
                  } finally {
                    setIsRefreshingMetadata(false);
                  }
                }}
                disabled={isRefreshingMetadata}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-white/90 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Refresh metadata for all URLs with improved extractor"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isRefreshingMetadata ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isRefreshingMetadata ? "Refreshing..." : "Refresh Metadata"}
                </span>
              </button>
            )}
            {/* Health Check Button */}
            {list.urls && list.urls.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (!list.id) return;
                  setIsCheckingHealth(true);
                  try {
                    const response = await fetch("/api/jobs/check-urls", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ listId: list.id }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                      // Update list immediately if returned
                      if (data.list) {
                        flushSync(() => {
                          currentList.set(data.list);
                        });

                        // CRITICAL: Dispatch activity-added event if activity data is present
                        if (data.activity && typeof slug === "string") {
                          window.dispatchEvent(
                            new CustomEvent("activity-added", {
                              detail: {
                                listId: data.list.id || list?.id,
                                activity: data.activity,
                              },
                            })
                          );
                        }

                        // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
                        // This ensures activity feed gets complete updated list with health check activity
                        if (typeof slug === "string") {
                          queryClient.invalidateQueries({
                            queryKey: listQueryKeys.unified(slug),
                          });
                        }
                      } else if (typeof slug === "string") {
                        // Fallback: use React Query invalidation - triggers unified endpoint refetch
                        queryClient.invalidateQueries({
                          queryKey: listQueryKeys.unified(slug),
                        });
                      }

                      toast({
                        title: "Health Check Complete! ✅",
                        description: `Checked ${
                          data.checked || 0
                        } URLs. Healthy: ${
                          data.results?.healthy || 0
                        }, Warning: ${data.results?.warning || 0}, Broken: ${
                          data.results?.broken || 0
                        }`,
                        variant: "success",
                      });
                    } else {
                      toast({
                        title: "Health Check Failed",
                        description: data.error || "Failed to check URL health",
                        variant: "error",
                      });
                    }
                  } catch {
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred",
                      variant: "error",
                    });
                  } finally {
                    setIsCheckingHealth(false);
                  }
                }}
                disabled={isCheckingHealth}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white/90 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Check URL health status for this list"
              >
                <Activity
                  className={`w-4 h-4 ${
                    isCheckingHealth ? "animate-spin" : ""
                  }`}
                />
                <span>{isCheckingHealth ? "Checking..." : "Health Check"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Shareable Link */}
        <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
          <span className="text-xs sm:text-sm font-light text-white/70 whitespace-nowrap">
            Shareable Link:
          </span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-white/90 truncate">
              {mounted && list?.slug
                ? `${window.location.origin}/list/${list.slug}`
                : list?.slug
                ? `/list/${list.slug}`
                : ""}
            </span>
            <button
              type="button"
              onClick={async () => {
                const url = mounted && list?.slug
                  ? `${window.location.origin}/list/${list.slug}`
                  : list?.slug
                  ? `/list/${list.slug}`
                  : "";
                if (!url) return;
                try {
                  await navigator.clipboard.writeText(url);
                  setIsCopied(true);
                  toast({
                    title: "Copied!",
                    description: "Link copied to clipboard",
                    variant: "success",
                  });
                  setTimeout(() => setIsCopied(false), 2000);
                } catch {
                  toast({
                    title: "Failed",
                    description: "Failed to copy link",
                    variant: "error",
                  });
                }
              }}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors duration-200 group"
              aria-label="Copy link"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Copy className="w-4 h-4 text-white/70 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
              )}
            </button>
          </div>
        </div>

        {/* Collaborators Section - PermissionManager */}
        {list.id && list.slug && (
          <div className="mt-4 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <PermissionManager
              listId={list.id}
              listTitle={list.title || "Untitled List"}
              listSlug={list.slug}
            />
          </div>
        )}

        {/* Smart Collections Section */}
        {list.id && list.slug && (
          <div className="mt-6">
            <SmartCollections listId={list.id} listSlug={list.slug} />
          </div>
        )}

        {/* Activity Feed Section */}
        {list.id && (
          <div className="mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <ActivityFeed listId={list.id} limit={30} />
          </div>
        )}
      </div>
      <UrlList />

      {/* PermissionManager handles all collaborator dialogs internally */}
    </div>
  );
}
