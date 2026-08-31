"use client";

import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { UrlList } from "@/components/lists/UrlList";
import { Button } from "@/components/ui/Button";
import { Copy, Check, Globe } from "lucide-react";
import { ListDetailJobsMenu } from "@/components/lists/ListDetailJobsMenu";
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
  useUpdateListVisibility,
} from "@/hooks/useListQueries";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/Dialog";
import EditListPageClient from "@/components/pages/EditListPage";
import { ListDetailRouteSkeleton } from "@/components/ui/RoutePageSkeleton";
import {
  ListDetailBodySkeletons,
  ListDetailHeaderChrome,
} from "@/components/lists/ListDetailHeaderChrome";
import { CARD_PAD, HEADING_STACK, PAGE_STACK } from "@/lib/ui-spacing";
import { invalidateMutationImpact } from "@/utils/queryInvalidation";
import { useListDialogRouteState } from "@/hooks/useListDialogRouteState";
import { isSoftNavThinSeed } from "@/lib/soft-nav-cache";
import { cn, listShareUrl, resolveListShareUrl } from "@/lib/utils";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";

export default function ListPageClient() {
  const { toast } = useToast();
  const router = useRouter();
  const { warmRouterPush } = useWarmSoftNav();
  const { slug } = useParams();
  const {
    user: sessionUser,
    isLoading: sessionLoading,
    isAuthenticated,
  } = useSession();
  const storeList = useStore(currentList);
  const listSlug = typeof slug === "string" ? slug : "";
  const { editDialogSlug, closeDialog } = useListDialogRouteState({
    defaultEditSlug: listSlug,
  });
  const editDialogOpen = Boolean(listSlug) && editDialogSlug === listSlug;
  const [editPending, setEditPending] = useState(false);
  const queryClient = useQueryClient();

  // Setup SSE cache sync for React Query
  useEffect(() => {
    return setupSSECacheSync();
  }, []);

  // Use React Query for unified list data (C6.9: enable by slug so warm RQ paints before session settles)
  const {
    data: unifiedData,
    isLoading: isLoadingQuery,
    isPlaceholderData,
    isError: isUnifiedError,
  } = useUnifiedListQuery(listSlug, !!listSlug);

  // Prefer RQ cache for the active slug — include same-slug placeholder for warm soft-nav
  const cachedUnified = listSlug
    ? queryClient.getQueryData<{ list?: typeof storeList }>(
        listQueryKeys.unified(listSlug),
      )
    : undefined;
  const list =
    (unifiedData?.list?.slug === listSlug ? unifiedData.list : undefined) ??
    (cachedUnified?.list?.slug === listSlug ? cachedUnified.list : undefined) ??
    (storeList?.id && storeList.slug === listSlug ? storeList : undefined);

  // C7.9: permissions from RQ list so Switch enables before store sync
  const permissions = useListPermissions(list);

  // CRITICAL: Start with loading=false to show cached data immediately
  // Only show loading if we truly have no data
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false); // Track if component is mounted (prevents hydration errors)
  const [isCopied, setIsCopied] = useState(false);
  const visibilityMutation = useUpdateListVisibility();
  // inviteDialogOpen removed - PermissionManager handles dialogs internally
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);
  const hasSyncedVectors = useRef<string | null>(null); // Track which list ID we've synced (in-memory)
  const syncInProgress = useRef<string | null>(null); // Track if sync is currently in progress for a list
  const hasRedirectedRef = useRef<boolean>(false); // Track if we've already redirected to prevent duplicate redirects

  // Clear stale store when navigating to a different slug (cache-hit skips queryFn).
  // useLayoutEffect so UrlList (reads currentList) does not paint the previous slug.
  useLayoutEffect(() => {
    if (!listSlug) return;
    const store = currentList.get();
    if (store?.slug && store.slug !== listSlug) {
      currentList.set({});
    }
  }, [listSlug]);

  // Sync RQ → currentList before paint (C7.10 thin-seed UrlList needs urls on first frame).
  useLayoutEffect(() => {
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

    // Wait for query completion before the client fallback redirect. Server page
    // guards normally redirect first; this covers a revoked session in-flight.
    if (isLoadingQuery) {
      return;
    }

    // A missing session can never read a public or private list.
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
      router.push("/login");
    } else {
      // The authenticated session or loaded list remains available.
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

  // Auto-sync vectors is a background index operation: it intentionally does not
  // invalidate list data because the route does not change any rendered list field.
  useEffect(() => {
    if (!list?.id || !list.urls?.length) return;

    const listId = list.id;
    if (
      hasListSyncedVectors(listId) ||
      hasSyncedVectors.current === listId ||
      syncInProgress.current === listId
    ) {
      hasSyncedVectors.current = listId;
      return;
    }

    const clearVectorSyncMarker = () => {
      if (typeof window === "undefined") return;
      try {
        const stored = JSON.parse(
          localStorage.getItem("vector-synced-lists") || "[]",
        ) as string[];
        localStorage.setItem(
          "vector-synced-lists",
          JSON.stringify(stored.filter((id) => id !== listId)),
        );
        const sessionStored = JSON.parse(
          sessionStorage.getItem("vector-synced-lists") || "[]",
        ) as string[];
        sessionStorage.setItem(
          "vector-synced-lists",
          JSON.stringify(sessionStored.filter((id) => id !== listId)),
        );
      } catch {
        localStorage.removeItem("vector-synced-lists");
        sessionStorage.removeItem("vector-synced-lists");
      }
    };

    async function syncVectors() {
      syncInProgress.current = listId;
      hasSyncedVectors.current = listId;
      markListVectorSynced(listId);

      try {
        const response = await fetch(`/api/lists/${listId}/sync-vectors`, {
          method: "POST",
        });
        if (!response.ok) throw new Error("Vector sync failed");
        if (!hasListSyncedVectors(listId)) markListVectorSynced(listId);
      } catch {
        clearVectorSyncMarker();
        hasSyncedVectors.current = null;
      } finally {
        syncInProgress.current = null;
      }
    }

    const timeoutId = setTimeout(() => {
      if (list && !isLoading && list.id) {
        void syncVectors();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?.id]); // Only run when list ID changes

  // Matched slug only — never treat another list's placeholder as "have data"
  const hasAnyData = !!(list && list.id && list.slug === listSlug);

  // C7.9/C7.10.1: thin soft-nav seed keeps body skeletons until hydrate clears marker.
  // Ignore stuck thin flag when unified query errored but we still have list data.
  const showThinBodySkeletons =
    hasAnyData &&
    !isUnifiedError &&
    (isSoftNavThinSeed(unifiedData) ||
      isSoftNavThinSeed(
        cachedUnified as { _softNavThinSeed?: boolean } | undefined,
      ));

  // C6.9: paint immediately when RQ/store has this slug; skeleton only when cold
  const shouldShowLoading =
    Boolean(listSlug) && !hasAnyData && (isLoadingQuery || sessionLoading);

  if (shouldShowLoading) {
    return <ListDetailRouteSkeleton />;
  }

  if (!list?.id) {
    return (
      <div className={cn("w-full", PAGE_STACK)}>
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
    <div className={cn("w-full", PAGE_STACK)}>
      <ListDetailHeaderChrome
        list={{
          slug: list.slug!,
          title: list.title,
          description: list.description,
          isPublic: list.isPublic,
          urls: list.urls ?? [],
        }}
        canInvite={permissions.canInvite}
        visibilityPending={visibilityMutation.isPending}
        onBack={() => warmRouterPush("/lists")}
        onVisibilityChange={(newValue) => {
          if (!list.id || !list.slug) return;
          visibilityMutation.mutate(
            { id: list.id, slug: list.slug, isPublic: newValue },
            {
              onSuccess: () =>
                toast({
                  title: newValue ? "Made Public" : "Made Private",
                  description: `List is now ${newValue ? "public" : "private"}`,
                  variant: "success",
                }),
              onError: (error) =>
                toast({
                  title: "Visibility Update Failed",
                  description:
                    error instanceof Error
                      ? error.message
                      : "Please try again.",
                  variant: "error",
                }),
            },
          );
        }}
        actions={
          <ListDetailJobsMenu
            hasUrls={Boolean(list.urls && list.urls.length > 0)}
            isSettingUpSchedule={isSettingUpSchedule}
            isRefreshingMetadata={isRefreshingMetadata}
            isCheckingHealth={isCheckingHealth}
            onSetupSchedule={async () => {
              setIsSettingUpSchedule(true);
              try {
                const response = await fetch("/api/jobs/setup-schedule", {
                  method: "POST",
                });
                const data = await response.json();
                if (response.ok) {
                  toast({
                    title: "Scheduled Jobs Setup Complete!",
                    description:
                      "Daily health checks and weekly metadata refresh are now scheduled.",
                    variant: "success",
                  });
                } else if (data.localDevelopment) {
                  toast({
                    title: "Local Development Detected",
                    description:
                      "Scheduled jobs require a public URL. Deploy to production or set up manually in QStash dashboard.",
                    variant: "info",
                  });
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
            onRefreshMetadata={async () => {
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
                  if (list.urls && list.urls.length > 0) {
                    window.dispatchEvent(
                      new CustomEvent("metadata-refresh-complete", {
                        detail: { listId: list.id },
                      }),
                    );
                  }
                  if (typeof slug === "string") {
                    invalidateMutationImpact(
                      queryClient,
                      "metadata",
                      slug,
                      list.id,
                    );
                  }
                  toast({
                    title: "Metadata Refresh Complete!",
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
            onHealthCheck={async () => {
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
                  if (data.list) {
                    flushSync(() => {
                      currentList.set(data.list);
                    });
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
                    if (typeof slug === "string") {
                      invalidateMutationImpact(
                        queryClient,
                        "action",
                        slug,
                        list.id,
                      );
                    }
                  } else if (typeof slug === "string") {
                    invalidateMutationImpact(
                      queryClient,
                      "action",
                      slug,
                      list.id,
                    );
                  }
                  toast({
                    title: "Health Check Complete!",
                    description: `Checked ${data.checked || 0} URLs. Healthy: ${
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
          />
        }
        shareRow={
          <div className="flex items-center gap-1.5 min-w-0 text-xs">
            <span className="inline-flex items-center gap-1.5 font-light text-white/70 whitespace-nowrap shrink-0">
              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Shareable Link:
            </span>
            <span className="text-white/90 truncate min-w-0">
              {list?.slug ? listShareUrl(list.slug) : ""}
            </span>
            <button
              type="button"
              onClick={async () => {
                const url = list?.slug ? resolveListShareUrl(list.slug) : "";
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
              className="inline-flex shrink-0 items-center p-0.5 rounded hover:bg-white/10 transition-colors duration-200 group"
              aria-label="Copy link"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-green-400 group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-white/70 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
              )}
            </button>
          </div>
        }
      />

      {/* C7.10: UrlList paints from thin seed; only collab / SC / activity stay skeleton */}
      {showThinBodySkeletons ? (
        <ListDetailBodySkeletons />
      ) : (
        <>
          {list.id && list.slug && (
            <div
              className={cn(
                "bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-xl",
                CARD_PAD,
              )}
            >
              <PermissionManager
                listId={list.id}
                listTitle={list.title || "Untitled List"}
                listSlug={list.slug}
              />
            </div>
          )}

          {list.id && list.slug && (
            <SmartCollections listId={list.id} listSlug={list.slug} />
          )}

          {list.id && (
            <div
              className={cn(
                "bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-xl",
                CARD_PAD,
              )}
            >
              <ActivityFeed listId={list.id} limit={30} />
            </div>
          )}
        </>
      )}

      <UrlList />

      {list.id ? (
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => !open && closeDialog()}
          title="Edit List"
          description="Update your list details and settings."
          size="wide"
          headerMode="scroll"
          pending={editPending}
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
            onClose={closeDialog}
            onPendingChange={setEditPending}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
