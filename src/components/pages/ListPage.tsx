"use client";

import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { UrlList } from "@/components/lists/UrlList";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { ListDetailJobsMenu } from "@/components/lists/ListDetailJobsMenu";
import {
  ListDetailShareRow,
  resolveListShareUrl,
} from "@/components/lists/ListDetailShareRow";
import { useToast } from "@/components/ui/Toaster";
import { useListPermissions } from "@/hooks/useListPermissions";
import { useSession } from "@/hooks/useSession";
import {
  useUnifiedListQuery,
  setupSSECacheSync,
  listQueryKeys,
  useUpdateListVisibility,
  prependUnifiedActivity,
  markUnifiedEventProcessed,
} from "@/hooks/useListQueries";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/Dialog";
import EditListPageClient from "@/components/pages/EditListPage";
import { ListDetailRouteSkeleton } from "@/components/ui/RoutePageSkeleton";
import {
  ListDetailBodySections,
  ListDetailBodySkeletons,
  ListDetailHeaderChrome,
} from "@/components/lists/ListDetailHeaderChrome";
import { PAGE_STACK } from "@/lib/ui-spacing";
import { resolveListUrlCount } from "@/lib/list-card-dto";
import { invalidateMutationImpact } from "@/utils/queryInvalidation";
import type { UnifiedActivity } from "@/lib/unified-list-response";
import type { UrlList as UrlListModel } from "@/stores/urlListStore";
import { useListDialogRouteState } from "@/hooks/useListDialogRouteState";
import {
  isSoftNavThinSeed,
  resolveListDetailPaintList,
  urlsBadgeSignature,
  SOFT_NAV_THIN_SEED,
} from "@/lib/soft-nav-cache";
import { cn } from "@/lib/utils";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { loginHrefWithNext } from "@/lib/auth-redirect";
import { clearAuthRedirect, setAuthRedirect } from "@/lib/logout-client";
import { ListNotFoundEmptyState } from "@/components/lists/ListEmptyStates";

export default function ListPageClient() {
  const { toast, updateToast } = useToast();
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

  const [mounted, setMounted] = useState(false); // Track if component is mounted (prevents hydration errors)
  const [isCopied, setIsCopied] = useState(false);
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<boolean | null>(
    null,
  );
  const visibilityMutation = useUpdateListVisibility();
  // inviteDialogOpen removed - PermissionManager handles dialogs internally
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);
  const hasRedirectedRef = useRef<boolean>(false); // Track if we've already redirected to prevent duplicate redirects

  // Prefer RQ cache for the active slug — include same-slug placeholder for warm soft-nav
  const cachedUnified = listSlug
    ? queryClient.getQueryData<{
        list?: typeof storeList;
        activities?: unknown[];
        collaborators?: unknown[];
        commentCounts?: Record<string, number>;
        accessDenied?: boolean;
        [SOFT_NAV_THIN_SEED]?: boolean;
      }>(listQueryKeys.unified(listSlug))
    : undefined;
  const rqList =
    (unifiedData?.list?.slug === listSlug ? unifiedData.list : undefined) ??
    (cachedUnified?.list?.slug === listSlug ? cachedUnified.list : undefined);
  const unifiedForPaint =
    unifiedData?.list?.slug === listSlug
      ? unifiedData
      : cachedUnified?.list?.slug === listSlug
        ? cachedUnified
        : undefined;
  // C7.26.1: RQ dehydrate wins over stale store urls.length until hydrated (RISK-0035).
  // Ignore nanostore until mounted so SSR + first client paint share RQ-only source.
  // C7.33: never paint store when unified reports accessDenied (revoked soft-nav).
  const accessDeniedPaint =
    Boolean(unifiedData?.accessDenied) ||
    Boolean(cachedUnified?.accessDenied && !rqList);
  const list = accessDeniedPaint
    ? undefined
    : resolveListDetailPaintList({
        slug: listSlug,
        rqList,
        storeList: mounted ? storeList : undefined,
        unifiedPayload: unifiedForPaint,
      });

  // C7.26.1: UrlList reads nanostore; sync during render so SSR + first client paint
  // share RQ urls including commentCount/clickCount (Comments badge hydration).
  if (list?.id && list.slug === listSlug) {
    const store = currentList.get();
    const rqUrls = Array.isArray(list.urls) ? list.urls : undefined;
    const storeUrls = Array.isArray(store.urls) ? store.urls : undefined;
    if (
      store.id !== list.id ||
      store.slug !== list.slug ||
      (rqUrls && (!storeUrls || storeUrls.length !== rqUrls.length)) ||
      (rqUrls &&
        urlsBadgeSignature(storeUrls) !== urlsBadgeSignature(rqUrls))
    ) {
      currentList.set(list);
    }
  }

  // C7.9: permissions from RQ list so Switch enables before store sync
  const permissions = useListPermissions(list);

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
  // C7.33: clear store on accessDenied so soft-nav cannot keep painting revoked list.
  useLayoutEffect(() => {
    if (unifiedData?.accessDenied) {
      const store = currentList.get();
      if (!listSlug || store?.slug === listSlug || store?.id === listSlug) {
        currentList.set({});
      }
      return;
    }
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

    // C7.33: authenticated accessDenied is owned by the kick effect (home + toast),
    // not the guest login redirect — avoids login flash after revoke.
    if (isAuthenticated && unifiedData?.accessDenied) {
      hasCheckedAuthRef.current = true;
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

      // Store current URL for redirect after login (?next= primary; sessionStorage fallback)
      // Skip while force-guest logout so plain login lands on home
      const currentPath = window.location.pathname + window.location.search;
      setAuthRedirect(currentPath);

      // Show toast notification
      toast({
        title: "Login Required",
        description:
          "You need to be logged in to view this list. Please sign in to continue.",
        variant: "info",
        duration: 5000,
      });

      // Mirror server requirePageUser: /login?next=…
      router.push(loginHrefWithNext(currentPath));
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

  // Track current permissions with a ref to check in callbacks
  const permissionsRef = useRef(permissions);
  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  // Track recent collaborator_removed events to handle live kick toasts
  const recentCollaboratorRemovedRef = useRef<{
    email: string;
    ownerEmail: string;
    timestamp: number;
  } | null>(null);

  // Live SSE: track collaborator_removed while we still have list id
  useEffect(() => {
    if (!sessionUser?.email || !list?.id || hasRedirectedRef.current) {
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

      const isCollaboratorRemoved =
        customEvent.detail?.listId === list.id &&
        (customEvent.detail?.action === "collaborator_removed" ||
          customEvent.detail?.activity?.action === "collaborator_removed");

      if (!isCollaboratorRemoved) return;

      const activity = customEvent.detail?.activity;
      const removedEmail = activity?.details?.collaboratorEmail as
        | string
        | undefined;
      const ownerEmail = activity?.user?.email as string | undefined;
      const isCurrentUser =
        removedEmail &&
        removedEmail.toLowerCase() === sessionUser.email.toLowerCase();

      if (isCurrentUser || (!removedEmail && permissions.role !== "none")) {
        const hasRecentRemoval =
          recentCollaboratorRemovedRef.current &&
          Date.now() - recentCollaboratorRemovedRef.current.timestamp < 10000;

        if (permissions.role !== "none" || !hasRecentRemoval) {
          recentCollaboratorRemovedRef.current = {
            email: removedEmail || sessionUser.email,
            ownerEmail: ownerEmail || "the owner",
            timestamp: Date.now(),
          };

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
    };

    window.addEventListener("unified-update", handleUnifiedUpdate);
    return () => {
      window.removeEventListener("unified-update", handleUnifiedUpdate);
    };
  }, [
    list?.id,
    list?.slug,
    sessionUser?.email,
    permissions.role,
    queryClient,
  ]);

  // C7.33: kick on 401/403 even when list never loaded (cold invite after revoke).
  // Do not require list.id — that blocked the listener and flashed “List not found”.
  useEffect(() => {
    if (!sessionUser?.email || hasRedirectedRef.current || !listSlug) {
      return;
    }

    const kickAccessDenied = (ownerEmail?: string) => {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      hasCheckedAuthRef.current = true;

      const listName = list?.title || "this list";
      // Avoid re-login bounce to the same revoked invite path
      clearAuthRedirect();
      currentList.set({});
      if (listSlug) {
        queryClient.setQueryData(listQueryKeys.unified(listSlug), {
          list: null,
          activities: [],
          collaborators: [],
          accessDenied: true,
        });
      }

      const recent = recentCollaboratorRemovedRef.current;
      const removedMatch =
        recent &&
        Date.now() - recent.timestamp < 30000 &&
        recent.email.toLowerCase() === sessionUser.email.toLowerCase();

      if (removedMatch || ownerEmail) {
        toast({
          title: "Access Removed",
          description: `You have been removed from "${listName}" by ${
            ownerEmail || recent?.ownerEmail || "the owner"
          }.`,
          variant: "error",
          duration: 5000,
        });
      } else {
        toast({
          title: "Access Denied",
          description:
            "This list is no longer available to you. You may have been removed as a collaborator.",
          variant: "error",
          duration: 5000,
        });
      }

      // Soft-nav home — stay on skeleton until unmount (no list/login flash)
      router.replace("/");
    };

    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        slug?: string;
      }>;
      const eventListId = customEvent.detail?.listId;
      const eventSlug = customEvent.detail?.slug;
      const isOurList =
        (eventSlug && eventSlug === listSlug) ||
        (eventListId && eventListId === listSlug) ||
        (list?.id && eventListId === list.id) ||
        (list?.slug && eventListId === list.slug);

      if (!isOurList || hasRedirectedRef.current) return;
      kickAccessDenied();
    };

    window.addEventListener("unified-update-unauthorized", handleUnauthorized);

    // Race: query may have already settled with accessDenied before listener attached
    if (
      !isLoadingQuery &&
      (unifiedData?.accessDenied ||
        (cachedUnified?.accessDenied && !unifiedData?.list))
    ) {
      kickAccessDenied();
    }

    return () => {
      window.removeEventListener(
        "unified-update-unauthorized",
        handleUnauthorized,
      );
    };
  }, [
    sessionUser?.email,
    listSlug,
    list?.id,
    list?.slug,
    list?.title,
    isLoadingQuery,
    unifiedData?.accessDenied,
    unifiedData?.list,
    cachedUnified?.accessDenied,
    queryClient,
    router,
    toast,
  ]);

  // Auto-sync vectors deferred to Similar / smart-search first use
  // (`ensureListVectorsSynced`) so idle sync does not compete with cold detail.

  // Matched slug only — never treat another list's placeholder as "have data"
  const hasAnyData = !!(list && list.id && list.slug === listSlug);

  const unifiedForGate =
    unifiedData?.list?.slug === listSlug
      ? unifiedData
      : cachedUnified?.list?.slug === listSlug
        ? cachedUnified
        : undefined;
  // C7.9/C7.10.1: thin soft-nav seed keeps body skeletons until hydrate clears marker.
  // C7.26.1 verify-deep: only when payload is explicitly thin — `!isUnifiedListHydrated`
  // is also true for undefined gate and caused SSR BodySections vs client skeletons
  // HTML mismatch (LIST_STACK missing on first client paint).
  const showThinBodySkeletons =
    hasAnyData &&
    !isUnifiedError &&
    Boolean(listSlug) &&
    isSoftNavThinSeed(unifiedForGate);

  // C6.9: paint immediately when RQ has this slug; skeleton only when cold.
  // C7.26.1: do not wait on sessionLoading — dehydrate/RQ list is enough for chrome.
  // C7.33: accessDenied / kick-in-flight stay on skeleton (never List not found / login).
  const shouldShowLoading =
    Boolean(listSlug) &&
    !hasAnyData &&
    (isLoadingQuery || accessDeniedPaint || hasRedirectedRef.current);

  if (shouldShowLoading) {
    return <ListDetailRouteSkeleton />;
  }

  if (!list?.id) {
    return (
      <div className={cn("w-full", PAGE_STACK)}>
        <ListNotFoundEmptyState />
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
          urlCount: resolveListUrlCount(list),
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        }}
        canInvite={permissions.canInvite}
        visibilityPending={visibilityMutation.isPending}
        onBack={() => warmRouterPush("/lists")}
        onVisibilityChange={(newValue) => {
          if (!list.id || !list.slug || !permissions.canInvite) return;
          setPendingVisibility(newValue);
          setVisibilityDialogOpen(true);
        }}
        actions={
          <ListDetailJobsMenu
            canRunJobs={permissions.canEdit}
            hasUrls={resolveListUrlCount(list) > 0}
            isSettingUpSchedule={isSettingUpSchedule}
            isRefreshingMetadata={isRefreshingMetadata}
            isCheckingHealth={isCheckingHealth}
            onSetupSchedule={async () => {
              if (!permissions.canEdit) return;
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
              if (!permissions.canEdit || !list.id) return;
              setIsRefreshingMetadata(true);
              const urlCount = list.urls?.length ?? 0;
              const toastId = toast({
                title: "Refreshing Metadata",
                description: `Updating metadata for ${urlCount} URL${urlCount === 1 ? "" : "s"}…`,
                variant: "info",
                loading: true,
                duration: 0,
              });
              let toastSettled = false;
              const settleToast = (next: {
                title: string;
                description: string;
                variant: "success" | "error" | "info";
              }) => {
                if (toastSettled) return;
                toastSettled = true;
                updateToast(toastId, {
                  ...next,
                  loading: false,
                  duration: 5000,
                });
              };
              try {
                const response = await fetch("/api/jobs/refresh-metadata", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ listId: list.id }),
                  signal: AbortSignal.timeout(55_000),
                });
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                  if (data.list) {
                    const previous = currentList.get();
                    const mergedList = {
                      ...previous,
                      ...data.list,
                      urls: Array.isArray(data.list.urls)
                        ? data.list.urls
                        : previous.urls,
                    } as UrlListModel;
                    flushSync(() => {
                      currentList.set(mergedList);
                    });
                    if (typeof slug === "string") {
                      queryClient.setQueryData(
                        listQueryKeys.unified(slug),
                        (cached: { list: UrlListModel | null; activities?: UnifiedActivity[] } | undefined) => {
                          if (!cached) {
                            return {
                              list: mergedList,
                              activities: [],
                              commentCounts: {},
                            };
                          }
                          return { ...cached, list: mergedList };
                        },
                      );
                    }
                  }
                  if (data.activity && typeof slug === "string") {
                    prependUnifiedActivity(
                      queryClient,
                      slug,
                      data.activity as UnifiedActivity,
                    );
                    if (data.activity.id) {
                      markUnifiedEventProcessed(`activity:${data.activity.id}`);
                    }
                    window.dispatchEvent(
                      new CustomEvent("activity-added", {
                        detail: {
                          listId: data.list?.id || list.id,
                          activity: data.activity,
                        },
                      }),
                    );
                  }
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
                      { skipUnified: true },
                    );
                  }
                  const refreshed = data.refreshed ?? urlCount;
                  settleToast({
                    title: "Metadata Refresh Complete!",
                    description: `Refreshed metadata for ${refreshed} URL${refreshed === 1 ? "" : "s"} using improved extractor.`,
                    variant: "success",
                  });
                } else {
                  settleToast({
                    title: "Refresh Failed",
                    description: data.error || "Failed to refresh metadata",
                    variant: "error",
                  });
                }
              } catch (error) {
                const timedOut =
                  error instanceof DOMException && error.name === "TimeoutError";
                settleToast({
                  title: timedOut ? "Refresh Timed Out" : "Error",
                  description: timedOut
                    ? "Metadata refresh took too long. Try again or refresh fewer URLs."
                    : "An unexpected error occurred",
                  variant: "error",
                });
              } finally {
                // Safety net only — settleToast no-ops once try/catch already settled.
                if (!toastSettled) {
                  settleToast({
                    title: "Error",
                    description: "Metadata refresh ended unexpectedly",
                    variant: "error",
                  });
                }
                setIsRefreshingMetadata(false);
              }
            }}
            onHealthCheck={async () => {
              if (!permissions.canEdit || !list.id) return;
              setIsCheckingHealth(true);
              const urlCount = list.urls?.length ?? 0;
              const toastId = toast({
                title: "Health Check Running",
                description: `Checking ${urlCount} URL${urlCount === 1 ? "" : "s"} for availability…`,
                variant: "info",
                loading: true,
                duration: 0,
              });
              let toastSettled = false;
              const settleToast = (next: {
                title: string;
                description: string;
                variant: "success" | "error" | "info";
              }) => {
                if (toastSettled) return;
                toastSettled = true;
                updateToast(toastId, {
                  ...next,
                  loading: false,
                  duration: 5000,
                });
              };
              try {
                const response = await fetch("/api/jobs/check-urls", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ listId: list.id }),
                  signal: AbortSignal.timeout(55_000),
                });
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                  if (data.list) {
                    const previous = currentList.get();
                    const mergedList = {
                      ...previous,
                      ...data.list,
                      urls: Array.isArray(data.list.urls)
                        ? data.list.urls
                        : previous.urls,
                    } as UrlListModel;
                    flushSync(() => {
                      currentList.set(mergedList);
                    });
                    if (typeof slug === "string") {
                      queryClient.setQueryData(
                        listQueryKeys.unified(slug),
                        (cached: { list: UrlListModel | null; activities?: UnifiedActivity[] } | undefined) => {
                          if (!cached) {
                            return {
                              list: mergedList,
                              activities: [],
                              commentCounts: {},
                            };
                          }
                          return { ...cached, list: mergedList };
                        },
                      );
                    }
                    if (data.activity && typeof slug === "string") {
                      prependUnifiedActivity(
                        queryClient,
                        slug,
                        data.activity as UnifiedActivity,
                      );
                      if (data.activity.id) {
                        markUnifiedEventProcessed(`activity:${data.activity.id}`);
                      }
                      window.dispatchEvent(
                        new CustomEvent("activity-added", {
                          detail: {
                            listId: mergedList.id || list?.id,
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
                        { skipUnified: true },
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
                  const checked = data.checked ?? 0;
                  const healthy = data.results?.healthy ?? 0;
                  const warning = data.results?.warning ?? 0;
                  const broken = data.results?.broken ?? 0;
                  settleToast({
                    title: "Health Check Complete!",
                    description: `Checked ${checked} URL${checked === 1 ? "" : "s"}. Healthy: ${healthy}, Warning: ${warning}, Broken: ${broken}`,
                    variant: "success",
                  });
                } else {
                  settleToast({
                    title: "Health Check Failed",
                    description: data.error || "Failed to check URL health",
                    variant: "error",
                  });
                }
              } catch (error) {
                const timedOut =
                  error instanceof DOMException && error.name === "TimeoutError";
                settleToast({
                  title: timedOut ? "Health Check Timed Out" : "Error",
                  description: timedOut
                    ? "Health check took too long. Try again."
                    : "An unexpected error occurred",
                  variant: "error",
                });
              } finally {
                // Safety net only — settleToast no-ops once try/catch already settled.
                if (!toastSettled) {
                  settleToast({
                    title: "Error",
                    description: "Health check ended unexpectedly",
                    variant: "error",
                  });
                }
                setIsCheckingHealth(false);
              }
            }}
          />
        }
        shareRow={
          <ListDetailShareRow
            slug={list.slug!}
            createdAt={list.createdAt}
            updatedAt={list.updatedAt}
            isCopied={isCopied}
            onCopy={async () => {
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
          />
        }
      />

      <AlertDialog
        open={visibilityDialogOpen}
        onOpenChange={(open) => {
          if (!visibilityMutation.isPending) {
            setVisibilityDialogOpen(open);
            if (!open) setPendingVisibility(null);
          }
        }}
        title={pendingVisibility ? "Make list public?" : "Make list private?"}
        description={
          pendingVisibility
            ? "Anyone with the link will be able to view this list."
            : "Only you & collaborators will be able to view this list."
        }
        confirmText={pendingVisibility ? "Make Public" : "Make Private"}
        cancelText="Cancel"
        pending={visibilityMutation.isPending}
        pendingText="Updating…"
        closeOnConfirm={false}
        onConfirm={() => {
          if (!list.id || !list.slug || pendingVisibility === null) return;
          visibilityMutation.mutate(
            { id: list.id, slug: list.slug, isPublic: pendingVisibility },
            {
              onSuccess: () => {
                toast({
                  title: pendingVisibility ? "Made Public" : "Made Private",
                  description: `List is now ${pendingVisibility ? "public" : "private"}`,
                  variant: "success",
                });
                requestAnimationFrame(() => {
                  setVisibilityDialogOpen(false);
                  setPendingVisibility(null);
                });
              },
              onError: (error) => {
                toast({
                  title: "Visibility Update Failed",
                  description:
                    error instanceof Error
                      ? error.message
                      : "Please try again.",
                  variant: "error",
                });
              },
            },
          );
        }}
      />

      {/* C7.10: UrlList paints from thin seed; only collab / SC / activity stay skeleton */}
      {showThinBodySkeletons ? (
        <ListDetailBodySkeletons
          urlCount={resolveListUrlCount(list)}
          knownCollaboratorCount={
            Array.isArray(list.collaborators)
              ? list.collaborators.length
              : undefined
          }
        />
      ) : (
        <ListDetailBodySections
          list={{
            id: list.id,
            slug: list.slug!,
            title: list.title,
            urls: list.urls,
            isPublic: list.isPublic ?? false,
          }}
        />
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
