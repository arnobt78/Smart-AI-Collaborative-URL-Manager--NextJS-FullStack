"use client";

import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { UrlList } from "@/components/lists/UrlList";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { glassActionButtonClass } from "@/lib/ui/glass-button-styles";
import { Copy, Check, Globe, Lock, Activity, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
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
import {
  invalidateBrowseQueries,
  invalidateListQueries,
} from "@/utils/queryInvalidation";
import { Dialog } from "@/components/ui/Dialog";
import EditListPageClient from "@/components/pages/EditListPage";
import { HEADING_STACK } from "@/lib/ui-spacing";

export default function ListPageClient() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useParams();
  const {
    user: sessionUser,
    isLoading: sessionLoading,
    isAuthenticated,
  } = useSession();
  const storeList = useStore(currentList);
  const permissions = useListPermissions(); // Get permissions for current list and user
  const listSlug = typeof slug === "string" ? slug : "";
  const editDialogOpen = searchParams.get("dialog") === "edit";
  const queryClient = useQueryClient();

  // Setup SSE cache sync for React Query
  useEffect(() => {
    return setupSSECacheSync();
  }, []);

  // Use React Query for unified list data
  const {
    data: unifiedData,
    isLoading: isLoadingQuery,
    isPlaceholderData,
  } = useUnifiedListQuery(listSlug, !!listSlug && !sessionLoading);

  // Prefer RQ cache for the active slug — store alone lags on cache-hit navigations
  const list =
    (unifiedData?.list?.slug === listSlug && !isPlaceholderData
      ? unifiedData.list
      : undefined) ??
    (storeList?.id && storeList.slug === listSlug ? storeList : undefined);

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
  const [editDialogPending, setEditDialogPending] = useState(false);
  const hasSyncedVectors = useRef<string | null>(null); // Track which list ID we've synced (in-memory)
  const syncInProgress = useRef<string | null>(null); // Track if sync is currently in progress for a list
  const hasRedirectedRef = useRef<boolean>(false); // Track if we've already redirected to prevent duplicate redirects

  // Clear stale store when navigating to a different slug (cache-hit skips queryFn)
  useEffect(() => {
    if (!listSlug) return;
    const store = currentList.get();
    if (store?.slug && store.slug !== listSlug) {
      currentList.set({});
    }
  }, [listSlug]);

  // Sync RQ cache → currentList when queryFn did not run (staleTime Infinity cache hit)
  useEffect(() => {
    if (
      unifiedData?.list &&
      unifiedData.list.slug === listSlug &&
      !isPlaceholderData
    ) {
      currentList.set(unifiedData.list);
    }
  }, [unifiedData, listSlug, isPlaceholderData]);
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
      localStorage.getItem("vector-synced-lists") || "[]",
    );
    if (localSyncedLists.includes(listId)) {
      return true;
    }

    // Check sessionStorage as backup (persists in current session, survives Fast Refresh better)
    const sessionSyncedLists = JSON.parse(
      sessionStorage.getItem("vector-synced-lists") || "[]",
    );
    return sessionSyncedLists.includes(listId);
  };

  // Mark list as vector synced in both localStorage and sessionStorage
  const markListVectorSynced = (listId: string) => {
    if (typeof window === "undefined") return;

    // Mark in localStorage (persists across sessions)
    const localSyncedLists = JSON.parse(
      localStorage.getItem("vector-synced-lists") || "[]",
    );
    if (!localSyncedLists.includes(listId)) {
      localSyncedLists.push(listId);
      // Keep only last 100 lists to prevent localStorage bloat
      const trimmed = localSyncedLists.slice(-100);
      localStorage.setItem("vector-synced-lists", JSON.stringify(trimmed));
    }

    // Also mark in sessionStorage as backup (survives Fast Refresh better)
    const sessionSyncedLists = JSON.parse(
      sessionStorage.getItem("vector-synced-lists") || "[]",
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
    if (
      hasCheckedAuthRef.current ||
      sessionLoading ||
      hasRedirectedRef.current ||
      !mounted
    ) {
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
        description:
          "You need to be logged in to view this list. Please sign in to continue.",
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
  // CRITICAL: Always set up 401 handler to catch access removal, even if user doesn't have access initially
  // This handles the case where user was removed and then navigates to the page
  useEffect(() => {
    if (
      !sessionUser?.email ||
      !list?.id ||
      hasRedirectedRef.current ||
      isLoading
    ) {
      return;
    }

    const handleUnifiedUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        action?: string;
        slug?: string;
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

      // CRITICAL: Handle collaborator_removed actions for this list
      // Track removal events if it's for the current user (even if they don't have access now)
      const isCollaboratorRemoved =
        customEvent.detail?.listId === list.id &&
        (customEvent.detail?.action === "collaborator_removed" ||
          customEvent.detail?.activity?.action === "collaborator_removed");

      if (isCollaboratorRemoved) {
        // Get collaborator email from activity details (from activity_created SSE event)
        // If not available, we'll still track the removal event and check permissions after 401
        const activity = customEvent.detail?.activity;
        const removedEmail = activity?.details?.collaboratorEmail as
          | string
          | undefined;
        const ownerEmail = activity?.user?.email as string | undefined;

        // CRITICAL: If we have the email and it matches current user, track it
        // If we don't have email, still track the event (we'll check permissions after 401)
        const isCurrentUser =
          removedEmail &&
          removedEmail.toLowerCase() === sessionUser.email.toLowerCase();

        // Track removal event if:
        // 1. Email matches current user, OR
        // 2. No email provided but user currently has access (will verify after 401)
        if (isCurrentUser || (!removedEmail && permissions.role !== "none")) {
          // Only track if user currently has access (about to lose it) or if we don't have recent removal tracked
          // This prevents overwriting recent removal tracking with stale historical events
          const hasRecentRemoval =
            recentCollaboratorRemovedRef.current &&
            Date.now() - recentCollaboratorRemovedRef.current.timestamp < 10000; // Within last 10 seconds

          if (permissions.role !== "none" || !hasRecentRemoval) {
            // Store this event info for 401 handling
            // Use current user email if not provided in event (will be verified after 401)
            recentCollaboratorRemovedRef.current = {
              email: removedEmail || sessionUser.email,
              ownerEmail: ownerEmail || "the owner",
              timestamp: Date.now(),
            };

            // If user currently has access, invalidate query to trigger refetch (will get 401 if removed)
            if (permissions.role !== "none" && !hasRedirectedRef.current) {
              const slugToInvalidate = customEvent.detail?.slug || list.slug;
              if (slugToInvalidate) {
                queryClient.invalidateQueries({
                  queryKey: listQueryKeys.unified(slugToInvalidate),
                });
              }
            }
          }
        }
      }
    };

    // Handle 401 Unauthorized from unified endpoint (indicates access was removed)
    // CRITICAL: This handles 401 errors even if user doesn't have initial access
    // This ensures redirect works when user navigates to page after being removed
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        slug?: string;
      }>;

      // CRITICAL: Check if this is for our list by comparing both listId and slug
      // The event might have slug as listId if listId wasn't available
      const eventListId = customEvent.detail?.listId;
      const eventSlug = customEvent.detail?.slug;
      const isOurList =
        (eventListId && eventListId === list.id) ||
        (eventSlug && eventSlug === list.slug) ||
        eventListId === list.slug; // Handle case where slug is used as listId

      if (!isOurList || hasRedirectedRef.current) {
        return;
      }

      // Check if we have a recent collaborator_removed event (within last 30 seconds)
      // Extended window to handle cases where user navigates after removal
      if (
        recentCollaboratorRemovedRef.current &&
        Date.now() - recentCollaboratorRemovedRef.current.timestamp < 30000 // Within last 30 seconds
      ) {
        const removedInfo = recentCollaboratorRemovedRef.current;

        // Verify this is for the current user
        if (
          removedInfo.email.toLowerCase() === sessionUser.email.toLowerCase()
        ) {
          // 401 + recent collaborator_removed event = user was definitely removed
          handleRedirect(removedInfo.ownerEmail);
          return;
        }
      }

      // If no recent removal event but we get 401, check if user lost access
      // Check unified data directly (more reliable than permissions which might not have updated yet)
      const hasNoAccess = !unifiedData?.list || permissions.role === "none";

      if (hasNoAccess) {
        // Check if we have a recent collaborator_removed event (even without email match)
        // This handles the case where removal was tracked but email wasn't provided
        if (
          recentCollaboratorRemovedRef.current &&
          Date.now() - recentCollaboratorRemovedRef.current.timestamp < 30000 // Within last 30 seconds
        ) {
          // Use the tracked removal info (might not have email, but we know user was removed)
          handleRedirect(recentCollaboratorRemovedRef.current.ownerEmail);
        } else {
          // No removal event tracked - generic access denied
          // But still redirect since we got 401
          hasRedirectedRef.current = true;
          toast({
            title: "Access Denied",
            description: "You don't have access to this list.",
            variant: "error",
            duration: 5000,
          });
          setTimeout(() => {
            router.push("/");
          }, 500);
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
        handleUnauthorized,
      );
    };
  }, [
    list?.id,
    list?.slug,
    list?.title,
    queryClient,
    sessionUser?.email,
    router,
    toast,
    isLoading,
    permissions.role,
    unifiedData?.list,
  ]);

  // Auto-sync vectors for existing URLs when list loads (background, non-blocking)
  useEffect(() => {
    if (!list?.id || !list.urls || list.urls.length === 0) {
      return;
    }

    const listId = list.id; // Store in const to avoid stale closure issues

    // DEBUG: Log localStorage and sessionStorage check for vector sync debugging
    if (process.env.NODE_ENV === "development") {
      const _isSynced = hasListSyncedVectors(listId);
      const _localSyncedLists =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("vector-synced-lists") || "[]")
          : [];
      const _sessionSyncedLists =
        typeof window !== "undefined"
          ? JSON.parse(sessionStorage.getItem("vector-synced-lists") || "[]")
          : [];
    }

    // CRITICAL: Check localStorage IMMEDIATELY when component mounts (not after delay)
    // This ensures we skip sync on second visit even before the timeout runs
    if (hasListSyncedVectors(listId)) {
      hasSyncedVectors.current = listId; // Update ref for in-memory check
      if (process.env.NODE_ENV === "development") {
      }
      return; // Already synced - skip entirely
    }

    // Also check in-memory ref (for same session)
    if (hasSyncedVectors.current === listId) {
      if (process.env.NODE_ENV === "development") {
      }
      return; // Already synced in this session
    }

    // Check if sync is already in progress for this list
    if (syncInProgress.current === listId) {
      if (process.env.NODE_ENV === "development") {
      }
      return; // Sync already in progress
    }

    if (process.env.NODE_ENV === "development") {
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
      }
      markListVectorSynced(listId);

      // DEBUG: Verify localStorage was set correctly
      if (process.env.NODE_ENV === "development") {
        const _verifySynced = hasListSyncedVectors(listId);
        const _syncedLists =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("vector-synced-lists") || "[]")
            : [];
      }

      // Double-check localStorage was set correctly (defensive check)
      if (!hasListSyncedVectors(listId)) {
        if (process.env.NODE_ENV === "development") {
        }
        // If localStorage failed, we'll still try to sync, but mark again after success
      }

      // Sync vectors in background (don't block UI)
      if (process.env.NODE_ENV === "development") {
      }
      fetch(`/api/lists/${listId}/sync-vectors`, {
        method: "POST",
      })
        .then(() => {
          // Sync succeeded - localStorage already marked optimistically
          // Double-check it's still marked (defensive)
          if (!hasListSyncedVectors(listId)) {
            if (process.env.NODE_ENV === "development") {
            }
            markListVectorSynced(listId);
          }

          if (process.env.NODE_ENV === "development") {
            const _finalCheck = hasListSyncedVectors(listId);
          }

          // Clear sync in progress flag
          syncInProgress.current = null;
        })
        .catch(() => {
          // On failure, clear localStorage flag to allow retry on next visit
          if (typeof window !== "undefined") {
            const syncedLists = JSON.parse(
              localStorage.getItem("vector-synced-lists") || "[]",
            );
            const filtered = syncedLists.filter((id: string) => id !== listId);
            localStorage.setItem(
              "vector-synced-lists",
              JSON.stringify(filtered),
            );
          }

          // Reset refs so we can retry in same session
          hasSyncedVectors.current = null;
          syncInProgress.current = null;

          // Silently fail - vector sync is optional enhancement
          if (process.env.NODE_ENV === "development") {
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

  // Matched slug only — never treat another list's placeholder as "have data"
  const hasAnyData = !!(list && list.id && list.slug === listSlug);

  // Full-page skeleton only when no matched-slug data (warm cache → no flash)
  const shouldShowLoading =
    !mounted ||
    sessionLoading ||
    (!isAuthenticated && isLoadingQuery && !hasAnyData && listSlug) ||
    (!hasAnyData && isLoadingQuery && listSlug);
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen w-full">
        <div
          aria-busy="true"
          aria-live="polite"
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white/60 animate-pulse sm:p-4"
        >
          Loading list…
        </div>
      </div>
    );
  }

  if (!list?.id) {
    return (
      <div className="min-h-screen w-full">
        <div className="text-center">
          <div className={HEADING_STACK}>
            <h1 className="text-lg sm:text-xl font-medium">List not found</h1>
            <p className="text-gray-600">
              The list you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
          </div>
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
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-4  shadow-xl">
        {/* First Row: Title/Info on Left, Buttons on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4  sm:mb-4">
          {/* Left Side: Title, URL Count, Visibility Badge, Toggle */}
          <div className="flex flex-col gap-2 sm:gap-2">
            {/* Title */}
            <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-medium text-white break-words">
              {list.title || `List: ${list.slug}`}
            </h1>

            {/* Badges and Toggle Row */}
            <div className="flex items-center gap-2 sm:gap-2 flex-wrap">
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
              <div className="flex items-center gap-1">
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
                        },
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
                <span className="text-[10px] text-white/50 hidden sm:inline">
                  {list.isPublic ? "Public" : "Private"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Setup Schedule and Health Check Buttons */}
          <div className="flex items-center gap-2 sm:gap-2 flex-wrap">
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
              className={glassActionButtonClass(
                "violet",
                "shrink-0 h-8 px-2 sm:px-3 text-xs",
              )}
              title="Setup scheduled jobs (daily health checks, weekly metadata refresh)"
            >
              <Activity
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                  isSettingUpSchedule ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">
                {isSettingUpSchedule ? "Setting up..." : "Setup Schedule"}
              </span>
              <span className="sm:hidden">Schedule</span>
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
                          }),
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
                className={glassActionButtonClass(
                  "emerald",
                  "shrink-0 h-8 px-2 sm:px-3 text-xs",
                )}
                title="Refresh metadata for all URLs with improved extractor"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    isRefreshingMetadata ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">
                  {isRefreshingMetadata ? "Refreshing..." : "Refresh Metadata"}
                </span>
                <span className="sm:hidden">Refresh</span>
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
                            }),
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
                className={glassActionButtonClass(
                  "blue",
                  "shrink-0 h-8 px-2 sm:px-3 text-xs",
                )}
                title="Check URL health status for this list"
              >
                <Activity
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    isCheckingHealth ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">
                  {isCheckingHealth ? "Checking..." : "Health Check"}
                </span>
                <span className="sm:hidden">Health</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Shareable Link */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 flex-wrap pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
          <span className="text-xs sm:text-sm font-light text-white/70 whitespace-nowrap">
            Shareable Link:
          </span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
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
                const url =
                  mounted && list?.slug
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
              className="flex-shrink-0 p-1.5 rounded-md sm:rounded-lg hover:bg-white/10 transition-colors duration-200 group"
              aria-label="Copy link"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
              )}
            </button>
          </div>
        </div>

        {/* Collaborators Section - PermissionManager */}
        {list.id && list.slug && (
          <div className="mt-2 sm:mt-4 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-xl">
            <PermissionManager
              listId={list.id}
              listTitle={list.title || "Untitled List"}
              listSlug={list.slug}
            />
          </div>
        )}

        {/* Smart Collections Section */}
        {list.id && list.slug && (
          <div className="mt-4 sm:mt-6">
            <SmartCollections listId={list.id} listSlug={list.slug} />
          </div>
        )}

        {/* Activity Feed Section */}
        {list.id && (
          <div className="mt-4 sm:mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-xl">
            <ActivityFeed listId={list.id} limit={30} />
          </div>
        )}
      </div>
      {/* Gap between Activity Feed / header card and Active URLs row */}
      <div className="mt-6 sm:mt-8">
        <UrlList />
      </div>
      {list.id ? (
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => !open && router.replace(`/list/${listSlug}`, { scroll: false })}
          title="Edit List"
          description="Update your list details and settings."
          size="wide"
          headerMode="scroll"
          pending={editDialogPending}
        >
          <EditListPageClient
            key={list.id}
            list={{
              id: list.id,
              slug: listSlug,
              title: list.title,
              description: list.description,
              isPublic: list.isPublic,
            }}
            onClose={() => router.replace(`/list/${listSlug}`, { scroll: false })}
            onPendingChange={setEditDialogPending}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
