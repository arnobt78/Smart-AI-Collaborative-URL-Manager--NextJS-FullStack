"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { currentList, removeUrlFromList, collectionCreateInFlight } from "@/stores/urlListStore";
import { Button } from "@/components/ui/Button";
import {
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionCountBadge } from "@/components/ui/SectionCountBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toaster";
import { useListPermissions } from "@/hooks/useListPermissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listQueryKeys } from "@/hooks/useListQueries";
import type {
  CollectionSuggestion,
  DuplicateDetection,
} from "@/lib/ai/collections";
import {
  Sparkles,
  FolderPlus,
  ListPlus,
  Link2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Search,
  Trash2,
  Telescope,
  ChevronsUp,
} from "lucide-react";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
import { CARD_STACK, HEADING_STACK } from "@/lib/ui-spacing";
import {
  UI_ICON_CONTROL,
  UI_ICON_DECORATIVE,
  UI_IDENTITY_GAP,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";
import { densifyAllLists, densifyBrowsePublicLists } from "@/utils/queryInvalidation";

interface SmartCollectionsProps {
  listId: string;
  listSlug: string;
}

export function SmartCollections({ listId, listSlug }: SmartCollectionsProps) {
  const { toast } = useToast();
  const { warmRouterPush } = useWarmSoftNav();
  const list = useStore(currentList);
  const permissions = useListPermissions(); // Get permissions for role-based access control
  const queryClient = useQueryClient();
  const componentMountedRef = useRef<number>(Date.now()); // Track when component mounted

  // OPTIMIZATION: Use React Query for collection suggestions with automatic caching
  // React Query handles browser session caching, memoization, and background refetching
  // OPTIMIZATION: React Query handles caching automatically - no artificial delays needed
  // With staleTime: Infinity, cached data shows instantly on subsequent visits
  // First visit: Fetches in background (non-blocking with placeholderData), page shows immediately
  // Subsequent visits: Uses cache instantly (no API call)
  // After invalidation: Refetches once, then cached again
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useQuery<{
    suggestions: CollectionSuggestion[];
  }>({
    queryKey: [...listQueryKeys.collections(listId), list?.urls?.length],
    queryFn: async () => {
      if (!listSlug) {
        throw new Error("List slug required");
      }
      const response = await fetch(
        `/api/lists/${listSlug}/collections?includeDuplicates=false&minGroupSize=2&maxCollections=10`,
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - user lost access, return empty (silently handled)
          return { suggestions: [] };
        }
        throw new Error(`Failed to fetch collections: ${response.status}`);
      }

      const data = await response.json();
      return { suggestions: data.suggestions || [] };
    },
    // Defer cold-path AI cost until user expands Smart Collections
    enabled:
      isExpanded && !!listSlug && !!list?.urls && list.urls.length >= 2,
    // CRITICAL: Cache forever until invalidated (after mutations/SSE)
    // With staleTime: Infinity, data never becomes stale automatically
    // Only becomes stale when manually invalidated, then refetches once
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in cache after component unmounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    // CRITICAL: Refetch only when stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    // Normal navigation uses cache instantly (no API calls)
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    retry: false, // Don't retry on error (let user manually refresh)
    // CRITICAL: Use stale data immediately if available, fetch fresh in background
    placeholderData: (previousData) => previousData, // Keep previous data visible while refetching
  });

  const suggestions = suggestionsData?.suggestions || [];
  const isLoading = isLoadingSuggestions;

  // OPTIMIZATION: Fetch duplicates separately on-demand with React Query caching
  // This keeps collections fast by default, duplicates are optional
  const [shouldFetchDuplicates, setShouldFetchDuplicates] = useState(false);
  const {
    data: duplicatesData,
    isLoading: isLoadingDuplicates,
    refetch: refetchDuplicates,
  } = useQuery<{ duplicates: DuplicateDetection[] }>({
    queryKey: [...listQueryKeys.duplicates(listId), list?.urls?.length], // Include URL count in key so cache invalidates when URLs change
    queryFn: async () => {
      // Use unified API endpoint without cache-busting - React Query handles caching
      const response = await fetch(
        `/api/lists/${listSlug}/collections?includeDuplicates=true&minGroupSize=2&maxCollections=10`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch duplicates");
      }
      const data = await response.json();
      return { duplicates: data.duplicates || [] };
    },
    enabled: shouldFetchDuplicates && !!listSlug && !!list?.urls, // Only fetch when explicitly requested
    // CRITICAL: Cache forever until invalidated (after URL add/remove)
    // Duplicates only change when URLs are added/removed, which invalidates cache
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 10 * 60 * 1000, // 10 minutes - cache kept for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // CRITICAL: Refetch only when stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    retry: false, // Don't retry on error to prevent infinite loops
    // React Query will use cached data if available, preventing duplicate API calls
  });

  const duplicates = duplicatesData?.duplicates || [];
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [deletingDuplicateIds, setDeletingDuplicateIds] = useState<Set<string>>(
    new Set(),
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDeletePending, setDuplicateDeletePending] = useState(false);
  const [pendingDeleteDuplicate, setPendingDeleteDuplicate] =
    useState<DuplicateDetection | null>(null);
  const [pendingCreateSuggestion, setPendingCreateSuggestion] =
    useState<CollectionSuggestion | null>(null);

  // Track last invalidation time and event IDs to prevent duplicate API calls
  const lastInvalidationRef = useRef<number>(0);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const INVALIDATION_DEBOUNCE_MS = 1000; // Debounce invalidations by 1 second

  // Track refresh loading state separately from query loading
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Force refresh (clears React Query cache and refetches)
  const refreshCollections = useCallback(async () => {
    if (!listSlug || !list?.urls || list.urls.length < 2) {
      toast({
        title: "Unable to Refresh",
        description: "Not enough URLs to generate collection suggestions",
        variant: "error",
      });
      return;
    }

    // Store previous suggestions count to show in toast
    const previousSuggestionsCount = suggestions.length;

    setIsRefreshing(true);
    try {
      // The refresh endpoint returns the newly computed suggestions, so one request
      // both clears server cache and commits the replacement client value.
      const result = await fetch(
        `/api/lists/${listSlug}/collections?clearCache=true&_t=${Date.now()}`,
      );
      if (!result.ok)
        throw new Error("Failed to refresh collection suggestions");
      const refreshedData = (await result.json()) as {
        suggestions?: CollectionSuggestion[];
      };
      queryClient.setQueryData(
        [...listQueryKeys.collections(listId), list?.urls?.length],
        { suggestions: refreshedData.suggestions || [] },
      );

      // Show success toast with dynamic message based on result
      const refreshedSuggestions = refreshedData.suggestions || [];
      if (refreshedSuggestions.length > 0) {
        toast({
          title: "Suggestions Refreshed",
          description: `Found ${
            refreshedSuggestions.length
          } collection suggestion${refreshedSuggestions.length > 1 ? "s" : ""}`,
          variant: "success",
        });
      } else if (previousSuggestionsCount > 0) {
        toast({
          title: "Suggestions Refreshed",
          description: "No new collection suggestions found",
          variant: "success",
        });
      } else {
        toast({
          title: "Suggestions Refreshed",
          description: "Collection suggestions have been refreshed",
          variant: "success",
        });
      }
    } catch (error) {
      // Handle expected errors silently (no error overlay):
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isExpectedError =
        errorMessage.includes("401") ||
        (error instanceof Error &&
          (error.name === "NetworkError" ||
            error.name === "AbortError" ||
            error.message.includes("aborted") ||
            error.message.includes("fetch")));

      if (!isExpectedError) {
        toast({
          title: "Refresh Failed",
          description:
            "Failed to refresh collection suggestions. Please try again.",
          variant: "error",
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [listSlug, list?.urls, listId, suggestions.length, toast, queryClient]);

  // UNIFIED EVENT LISTENER: Listen for URL changes via unified-update events (single source of truth)
  // Uses event deduplication to prevent processing the same event twice
  useEffect(() => {
    const handleUrlChange = (action: string, timestamp: number) => {
      // Only refresh if this is a real-time update (not from initial load)
      const timeSinceMount = Date.now() - componentMountedRef.current;
      if (timeSinceMount < 2000) {
        return;
      }

      // Create unique event ID for deduplication (prevents processing same event twice)
      const eventId = `${action}-${timestamp}-${listId}`;
      if (processedEventsRef.current.has(eventId)) {
        return; // Already processed this event
      }

      // Debounce invalidations to prevent duplicate API calls
      const now = Date.now();
      if (now - lastInvalidationRef.current < INVALIDATION_DEBOUNCE_MS) {
        return;
      }

      // Mark event as processed and update last invalidation time
      processedEventsRef.current.add(eventId);
      lastInvalidationRef.current = now;

      // Clean up old processed events (keep only last 50 to prevent memory leak)
      if (processedEventsRef.current.size > 50) {
        const eventsArray = Array.from(processedEventsRef.current);
        processedEventsRef.current = new Set(eventsArray.slice(-50));
      }

      // REMOVED: Automatic invalidations on unified-update events
      // These were causing duplicate API calls - invalidations happen via mutations only
      // React Query's staleTime handles background updates, user can manually refresh if needed
    };

    const handleUnifiedUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventListId = customEvent.detail?.listId;
      const action = customEvent.detail?.action || "";
      const eventTimestamp = customEvent.detail?.timestamp
        ? new Date(customEvent.detail.timestamp).getTime()
        : Date.now();

      // Ignore events that occurred before component mount
      if (eventTimestamp < componentMountedRef.current - 1000) {
        return;
      }

      if (eventListId === listId && listSlug) {
        // Only refresh collections for URL/collection changes (not collaborator changes)
        // This prevents unnecessary fetches when collaborators are added/removed/updated
        // Collaborator changes don't affect collections, so we skip them here
        if (
          action.includes("url_") ||
          action === "list_updated" ||
          action === "collection_created"
        ) {
          handleUrlChange(action, eventTimestamp);
        }
        // Note: collaborator_* actions are intentionally skipped to avoid unnecessary API calls
      }
    };

    // Only listen to unified-update (single source of truth)
    // activity-added events are handled by unified-update, so no need to listen separately
    window.addEventListener("unified-update", handleUnifiedUpdate);
    return () => {
      window.removeEventListener("unified-update", handleUnifiedUpdate);
    };
  }, [listId, listSlug, queryClient, showDuplicates, shouldFetchDuplicates]);

  // Create collection from suggestion
  const createCollection = async (suggestion: CollectionSuggestion) => {
    // Permission check: Only owners and editors can create collections
    if (!permissions.canEdit) {
      toast({
        title: "Permission Denied",
        description:
          "You don't have permission to create collections. Only owners and editors can create collections.",
        variant: "error",
      });
      return;
    }

    if (isCreating) return;

    setIsCreating(suggestion.id);
    collectionCreateInFlight.set(true);
    window.dispatchEvent(new CustomEvent("local-operation"));

    const suggestionKey = [
      ...listQueryKeys.collections(listId),
      list?.urls?.length,
    ] as const;
    const previousList = currentList.get();
    const previousUnified = queryClient.getQueryData<{
      list?: typeof previousList;
    }>(listQueryKeys.unified(listSlug));
    const previousAllLists = queryClient.getQueryData(listQueryKeys.allLists());
    const previousSuggestions = queryClient.getQueryData<{
      suggestions: CollectionSuggestion[];
    }>(suggestionKey);
    const movedUrlIds = new Set(suggestion.urls.map((url) => url.id));
    const optimisticUrls = (previousList.urls || []).filter(
      (url) => !movedUrlIds.has(url.id),
    );
    const optimisticSuggestionKey = [
      ...listQueryKeys.collections(listId),
      optimisticUrls.length,
    ] as const;
    const previousOptimisticSuggestions = queryClient.getQueryData<{
      suggestions: CollectionSuggestion[];
    }>(optimisticSuggestionKey);
    const nextSuggestions = (
      previousSuggestions?.suggestions || suggestions
    ).filter((item) => item.id !== suggestion.id);
    const nowIso = new Date().toISOString();
    const temporaryId = `temporary-collection-${suggestion.id}`;
    const collectionUrls = suggestion.urls.map((url) => ({
      id: url.id,
      url: url.url,
      title: url.title,
    }));

    // Keep source-list URLs intact until POST succeeds so AlertDialog cannot unmount.
    // Still warm My Lists + hide the consumed suggestion immediately.
    queryClient.setQueryData<{ suggestions: CollectionSuggestion[] }>(
      suggestionKey,
      { suggestions: nextSuggestions },
    );
    queryClient.setQueryData(optimisticSuggestionKey, {
      suggestions: nextSuggestions,
    });

    densifyAllLists(queryClient, {
      id: temporaryId,
      slug: temporaryId,
      title: suggestion.name,
      description:
        suggestion.description ||
        `Collection created from ${previousList.title || listSlug}`,
      urls: collectionUrls,
      isPublic: false,
      collaborators: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    const optimisticSource = {
      id: previousList.id || listId,
      slug: previousList.slug || listSlug,
      title: previousList.title,
      description: previousList.description,
      urls: optimisticUrls.map((url) => ({
        id: url.id,
        url: url.url,
        title: url.title,
      })),
      isPublic: previousList.isPublic,
      updatedAt: nowIso,
    };
    densifyAllLists(queryClient, optimisticSource);
    if (previousList.isPublic) {
      densifyBrowsePublicLists(queryClient, optimisticSource);
    }

    try {
      const response = await fetch(`/api/lists/${listSlug}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: suggestion.id,
          name: suggestion.name,
          description: suggestion.description,
          urlIds: suggestion.urls.map((u) => u.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create collection");
      }

      const data = (await response.json()) as {
        list?: Parameters<typeof densifyAllLists>[1];
        source?: Parameters<typeof densifyAllLists>[1] & {
          urls?: typeof previousList.urls;
        };
      };

      if (data.list) {
        densifyAllLists(queryClient, data.list, { temporaryId });
        // Full unified seed (not thin soft-nav) so opening the new collection
        // does not mount-refetch updates before SSE applies activities.
        if (data.list.slug) {
          queryClient.setQueryData(listQueryKeys.unified(data.list.slug), {
            list: data.list,
            activities: [],
            collaborators: [],
            commentCounts: {},
          });
        }
      }
      if (data.source) {
        densifyAllLists(queryClient, data.source);
        if (data.source.isPublic) {
          densifyBrowsePublicLists(queryClient, data.source);
        }
        // Authoritative detail update while dialog still open (create lock keeps SC mounted).
        const nextSourceUrls = Array.isArray(data.source.urls)
          ? data.source.urls
          : optimisticUrls;
        currentList.set({
          ...previousList,
          id: data.source.id,
          slug: data.source.slug,
          title: data.source.title ?? previousList.title,
          description: data.source.description ?? previousList.description,
          isPublic: data.source.isPublic ?? previousList.isPublic,
          updatedAt:
            typeof data.source.updatedAt === "string"
              ? data.source.updatedAt
              : previousList.updatedAt,
          urls: nextSourceUrls,
        });
        queryClient.setQueryData(
          listQueryKeys.unified(listSlug),
          (cached: typeof previousUnified) =>
            cached?.list
              ? {
                  ...cached,
                  list: {
                    ...cached.list,
                    id: data.source!.id,
                    slug: data.source!.slug,
                    title: data.source!.title ?? cached.list.title,
                    description:
                      data.source!.description ?? cached.list.description,
                    isPublic: data.source!.isPublic ?? cached.list.isPublic,
                    updatedAt:
                      typeof data.source!.updatedAt === "string"
                        ? data.source!.updatedAt
                        : cached.list.updatedAt,
                    urls: nextSourceUrls,
                  },
                }
              : cached,
        );
      }

      toast({
        title: "Collection Created",
        description: `Created "${suggestion.name}" with ${suggestion.urls.length} URLs`,
        variant: "success",
      });

      // Collections/duplicates only — unified already patched; avoid duplicate updates refetch
      queryClient.invalidateQueries({
        queryKey: listQueryKeys.collections(listId),
      });
      queryClient.invalidateQueries({
        queryKey: listQueryKeys.duplicates(listId),
      });
      setPendingCreateSuggestion(null);
    } catch (error) {
      currentList.set(previousList);
      queryClient.setQueryData(
        listQueryKeys.unified(listSlug),
        previousUnified,
      );
      if (previousAllLists) {
        queryClient.setQueryData(listQueryKeys.allLists(), previousAllLists);
      }
      queryClient.setQueryData(suggestionKey, previousSuggestions);
      if (previousOptimisticSuggestions) {
        queryClient.setQueryData(
          optimisticSuggestionKey,
          previousOptimisticSuggestions,
        );
      } else {
        queryClient.removeQueries({
          queryKey: optimisticSuggestionKey,
          exact: true,
        });
      }
      // Handle expected errors silently (no error overlay):
      // - 401 Unauthorized (user lost access)
      // - NetworkError/AbortError (page refresh during bulk import)
      // - Request aborted (normal during page transitions)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isExpectedError =
        errorMessage.includes("401") ||
        (error instanceof Error &&
          (error.name === "NetworkError" ||
            error.name === "AbortError" ||
            error.message.includes("aborted") ||
            error.message.includes("fetch")));

      if (!isExpectedError) {
        // Only show toast for unexpected errors
        toast({
          title: "Error",
          description: errorMessage,
          variant: "error",
        });
      }
    } finally {
      setIsCreating(null);
      collectionCreateInFlight.set(false);
    }
  };

  const showCreateDialog =
    pendingCreateSuggestion != null || Boolean(isCreating);
  const hasEnoughUrls = Boolean(list?.urls && list.urls.length >= 2);

  if (!hasEnoughUrls && !showCreateDialog) {
    return null;
  }

  // When URLs drop below 2 during an in-flight create, keep AlertDialog mounted
  // (do not early-return null) so the spinner stays until success/error.

  const hasSuggestions = suggestions.length > 0;
  const hasDuplicates = duplicates.length > 0;

  if (!isExpanded && !showCreateDialog) {
    return (
      <div className="flex items-center justify-between gap-2 sm:gap-2">
        <div className={cn("flex min-w-0 flex-1 items-center", UI_IDENTITY_GAP)}>
          <GlassIconTile icon={Sparkles} hue="violet" />
          <div className={`${HEADING_STACK} min-w-0`}>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="font-medium text-white text-sm sm:text-base truncate">
                Smart Collections
              </h3>
              {/* Count only after expand has warmed cache — avoid cold collections fetch */}
              {hasSuggestions ? (
                <SectionCountBadge count={suggestions.length} />
              ) : null}
            </div>
            <p className="text-xs sm:text-sm text-white/60 truncate">
              Get AI-powered collection suggestions
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(true)}
          className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm flex-shrink-0"
          aria-expanded={false}
          aria-controls="smart-collections-content"
        >
          <Telescope className={UI_ICON_CONTROL} aria-hidden />
          View Suggestions
        </Button>
      </div>
    );
  }

  return (
    <>
      {hasEnoughUrls ? (
      <div className={cn(CARD_STACK, "space-y-2 sm:space-y-3")}>
        <div className="flex items-center justify-between gap-2 sm:gap-2 ">
          <div className={cn("flex min-w-0 flex-1 items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Sparkles} hue="violet" />
            <div className={`${HEADING_STACK} min-w-0`}>
              <CardTitle className="text-sm sm:text-base font-medium text-white">
                Smart Collections
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                AI-powered suggestions to organize your URLs
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setIsExpanded(false)}
            className="shrink-0 text-xs sm:text-sm"
            aria-expanded={true}
            aria-controls="smart-collections-content"
          >
            <ChevronsUp className={UI_ICON_CONTROL} aria-hidden />
            View Less
          </Button>
        </div>

        <div
          id="smart-collections-content"
          className="flex flex-col gap-3 sm:gap-4"
        >
          {/* Loading State — only when cold (no suggestions yet) */}
          {isLoading && !hasSuggestions && (
            <div className="flex flex-col gap-3 sm:gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* Collection Suggestions — stay visible during refetch */}
          {hasSuggestions && (
            <div className="flex flex-col gap-3 sm:gap-4">
              <h4 className="text-xs sm:text-sm font-medium text-white flex items-center gap-2">
                <FolderPlus className={UI_ICON_CONTROL} />
                <span>Suggested Collections</span>
                <SectionCountBadge count={suggestions.length} />
              </h4>
              <div className="flex flex-col gap-3 sm:gap-4">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="border border-white/10 rounded-lg p-2 sm:p-4 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-4 flex-col sm:flex-row">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        {/* Title - Full width on phone */}
                        <h5 className="font-medium text-white text-sm sm:text-base w-full mb-1.5 break-words">
                          {suggestion.name}
                        </h5>
                        {/* URLs and Category Badges */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.urls.length} URLs
                          </Badge>
                          {suggestion.category && (
                            <Badge variant="outline" className="text-xs">
                              {suggestion.category}
                            </Badge>
                          )}
                        </div>
                        {/* Description - Full text on phone */}
                        <p className="text-xs sm:text-sm text-white/60 mb-1.5 break-words">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap">
                          <span>Confidence: {suggestion.confidence}%</span>
                          <span aria-hidden>•</span>
                          <span className="break-words">
                            {suggestion.reason}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!permissions.canEdit) return;
                          setPendingCreateSuggestion(suggestion);
                        }}
                        disabled={
                          isCreating === suggestion.id || !permissions.canEdit
                        }
                        className={`shrink-0 w-full sm:w-auto ${
                          !permissions.canEdit
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title={
                          !permissions.canEdit
                            ? "Only owners and editors can create collections"
                            : undefined
                        }
                      >
                        {isCreating === suggestion.id ? (
                          <>
                            <Loader2
                              className={cn(UI_ICON_CONTROL, "animate-spin")}
                            />
                            Creating…
                          </>
                        ) : (
                          <>
                            <ListPlus className={UI_ICON_CONTROL} />
                            Create Collection
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Detection - Only show if duplicates have been fetched */}
          {showDuplicates && (isLoadingDuplicates || hasDuplicates) && (
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-medium text-white flex items-center gap-2 min-w-0 flex-1">
                  <AlertTriangle
                    className={cn(UI_ICON_CONTROL, "text-yellow-400")}
                  />
                  <span className="truncate">
                    {isLoadingDuplicates
                      ? "Checking for duplicates..."
                      : hasDuplicates
                        ? "Duplicate URLs"
                        : "No duplicates found"}
                  </span>
                  {!isLoadingDuplicates && hasDuplicates ? (
                    <SectionCountBadge count={duplicates.length} />
                  ) : null}
                </h4>
                {!isLoadingDuplicates && hasDuplicates && (
                  <button
                    type="button"
                    onClick={() => setShowDuplicates(false)}
                    className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  >
                    Hide
                  </button>
                )}
              </div>
              {isLoadingDuplicates && (
                <div className="text-center py-4 sm:py-6">
                  <Loader2
                    className={cn(UI_ICON_CONTROL, "text-white/40 mx-auto animate-spin")}
                  />
                  <p className="text-[10px] sm:text-xs text-white/50 mt-2">
                    Checking URLs for duplicates...
                  </p>
                </div>
              )}
              {!isLoadingDuplicates && hasDuplicates && (
                <div className="space-y-2 sm:space-y-3">
                  {duplicates.map((dup, idx) => {
                    const isDeleting = deletingDuplicateIds.has(dup.url.id);

                    return (
                      <div
                        key={`${dup.url.id}-${idx}`}
                        className="border border-yellow-400/20 rounded-lg p-2 sm:p-4 bg-yellow-400/5"
                      >
                        <div className="flex items-start gap-2 sm:gap-2 flex-col sm:flex-row">
                          <div className="flex items-start gap-2 sm:gap-2 flex-1 min-w-0 w-full">
                            <AlertTriangle
                              className={cn(
                                UI_ICON_CONTROL,
                                "text-yellow-400 mt-0.5",
                              )}
                            />
                            <div className="flex-1 min-w-0 w-full">
                              <p className="text-xs sm:text-sm font-medium text-white break-words">
                                {dup.url.title || dup.url.url}
                              </p>
                              <p className="text-[10px] sm:text-xs text-white/60 break-words mt-1 break-all">
                                {dup.url.url}
                              </p>
                              <div className="mt-2 space-y-1">
                                {dup.duplicates.map((d, i) => (
                                  <div
                                    key={i}
                                    className="text-[10px] sm:text-xs text-white/70 flex items-start gap-1.5 flex-wrap"
                                  >
                                    <Link2 className={cn(UI_ICON_CONTROL, "mt-0.5")} />
                                    <span className="break-words flex-1 min-w-0">
                                      Also in:{" "}
                                      {d.listSlug ? (
                                        <button
                                          onClick={() => {
                                            warmRouterPush(
                                              `/list/${d.listSlug}`,
                                            );
                                          }}
                                          className=" hover:text-white transition-colors break-words"
                                          title={`Open ${d.listTitle || "list"}`}
                                        >
                                          {d.listTitle || "Unknown List"}
                                        </button>
                                      ) : (
                                        <span className="break-words">
                                          {d.listTitle || "Unknown List"}
                                        </span>
                                      )}{" "}
                                      ({Math.round(d.similarity * 100)}%
                                      similar)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          {permissions.canEdit && (
                            <button
                              onClick={() => {
                                setPendingDeleteDuplicate(dup);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={isDeleting}
                              className="shrink-0 px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-md border border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20 hover:border-red-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-colors flex items-center gap-1 sm:gap-1 w-full sm:w-auto justify-center sm:justify-start self-start sm:self-auto"
                              title="Remove this duplicate from current list"
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2
                                    className={cn(UI_ICON_CONTROL, "animate-spin")}
                                  />
                                  <span className="hidden sm:inline">
                                    Removing...
                                  </span>
                                  <span className="sm:hidden">Removing</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className={UI_ICON_CONTROL} />
                                  Remove
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isLoadingDuplicates && !hasDuplicates && (
                <div className="text-center py-4 sm:py-6 border border-green-400/20 rounded-lg bg-green-400/5">
                  <CheckCircle2
                    className={cn(UI_ICON_DECORATIVE, "text-green-400 mx-auto")}
                  />
                  <p className="text-xs sm:text-sm text-white/70 px-2">
                    No duplicate URLs found across your lists!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty State - Only show if no suggestions and duplicates section not expanded */}
          {!isLoading && !hasSuggestions && !showDuplicates && (
            <div className="text-center py-8">
              <CheckCircle2
                className={cn(UI_ICON_DECORATIVE, "text-white/20 mx-auto")}
              />
              <p className="text-white/60 text-sm">
                No collection suggestions available yet.
                <br />
                Add more URLs to get AI-powered suggestions.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-3 sm:pt-4 border-t border-white/10 gap-2 sm:gap-3">
            {/* Check Duplicates Button (on-demand) */}
            <button
              type="button"
              onClick={async () => {
                if (!showDuplicates) {
                  // Show duplicates section and always refetch fresh data
                  setShowDuplicates(true);
                  setShouldFetchDuplicates(true);

                  try {
                    // Always refetch to get latest duplicates (ignore cache)
                    const result = await refetchDuplicates();
                    // Show toast notification after check completes
                    const duplicateCount = result.data?.duplicates?.length || 0;
                    if (duplicateCount > 0) {
                      toast({
                        title: "Duplicates Found",
                        description: `Found ${duplicateCount} duplicate URL${
                          duplicateCount > 1 ? "s" : ""
                        } across your lists`,
                        variant: "warning",
                      });
                    } else {
                      toast({
                        title: "No Duplicates",
                        description:
                          "No duplicate URLs found across your lists!",
                        variant: "success",
                      });
                    }
                  } catch (_error) {
                    toast({
                      title: "Error",
                      description:
                        "Failed to check for duplicates. Please try again.",
                      variant: "error",
                    });
                    setShowDuplicates(false); // Hide section on error
                    setShouldFetchDuplicates(false);
                  }
                } else {
                  // Hide duplicates section
                  setShowDuplicates(false);
                  setShouldFetchDuplicates(false);
                }
              }}
              disabled={isLoadingDuplicates}
              className="inline-flex items-center justify-center rounded-md border border-white/20 bg-transparent px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-colors"
            >
              <Search
                className={cn(
                  UI_ICON_CONTROL,
                  "mr-1.5 sm:mr-2",
                  isLoadingDuplicates && "animate-spin",
                )}
              />
              {isLoadingDuplicates
                ? "Checking..."
                : showDuplicates
                  ? "Hide Duplicates"
                  : duplicates.length > 0
                    ? `Show Duplicates (${duplicates.length})`
                    : "Check Duplicates"}
            </button>

            {/* Refresh Suggestions Button */}
            <button
              type="button"
              onClick={refreshCollections}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center justify-center rounded-md border border-white/20 bg-transparent px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-colors"
            >
              <Loader2
                className={cn(
                  UI_ICON_CONTROL,
                  "mr-1.5 sm:mr-2",
                  (isLoading || isRefreshing) && "animate-spin",
                )}
              />
              {isRefreshing ? "Refreshing..." : "Refresh Suggestions"}
            </button>
          </div>
        </div>
      </div>
      ) : null}

      {/* Create Collection Confirmation Dialog */}
      <AlertDialog
        open={pendingCreateSuggestion != null}
        onOpenChange={(open) => {
          if (!open && !isCreating) setPendingCreateSuggestion(null);
        }}
        title="Create Collection"
        description={
          pendingCreateSuggestion
            ? `Create "${pendingCreateSuggestion.name}" as a new private list? ${pendingCreateSuggestion.urls.length} URL${pendingCreateSuggestion.urls.length === 1 ? "" : "s"} will leave this list and move into the new collection.`
            : ""
        }
        confirmText="Create Collection"
        cancelText="Cancel"
        pending={Boolean(
          pendingCreateSuggestion &&
            isCreating === pendingCreateSuggestion.id,
        )}
        pendingText="Creating…"
        closeOnConfirm={false}
        ensurePendingPaint
        onConfirm={async () => {
          if (!pendingCreateSuggestion) return;
          await createCollection(pendingCreateSuggestion);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!duplicateDeletePending) setDeleteDialogOpen(open);
        }}
        title="Remove Duplicate URL"
        description={
          pendingDeleteDuplicate
            ? `Are you sure you want to remove "${
                pendingDeleteDuplicate.url.title ||
                pendingDeleteDuplicate.url.url
              }" from this list? This action cannot be undone.`
            : ""
        }
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        pending={duplicateDeletePending}
        pendingText="Removing…"
        closeOnConfirm={false}
        onConfirm={async () => {
          if (!pendingDeleteDuplicate) return;

          const dup = pendingDeleteDuplicate;
          setDuplicateDeletePending(true);
          setDeletingDuplicateIds((prev) => new Set(prev).add(dup.url.id));

          try {
            await removeUrlFromList(dup.url.id, { optimistic: false });

            // Invalidate immediately for responsive UI, but use deduplication to prevent duplicate calls
            // Update lastInvalidationRef so unified-update event (which fires after SSE) won't duplicate this
            lastInvalidationRef.current = Date.now();

            // Optimistically remove deleted duplicate from UI immediately for instant feedback
            queryClient.setQueryData<{ duplicates: DuplicateDetection[] }>(
              [...listQueryKeys.duplicates(listId), list?.urls?.length],
              (old) => {
                if (!old?.duplicates) return old;
                // Remove the deleted duplicate from the list
                const filtered = old.duplicates.filter(
                  (d) => d.url.id !== dup.url.id,
                );
                return { duplicates: filtered };
              },
            );

            // removeUrlFromList commits the list snapshot and invalidates its URL impact once.

            // Show success toast with dynamic text
            const urlTitle = dup.url.title || dup.url.url;
            const duplicateCount = dup.duplicates.length;
            toast({
              title: "Duplicate Removed",
              description: `"${urlTitle}" has been removed from this list. ${
                duplicateCount > 1
                  ? `It was also found in ${duplicateCount - 1} other list${
                      duplicateCount - 1 > 1 ? "s" : ""
                    }.`
                  : ""
              }`,
              variant: "success",
            });

            requestAnimationFrame(() => {
              setDeleteDialogOpen(false);
              setPendingDeleteDuplicate(null);
            });
          } catch (_error) {
            toast({
              title: "Error",
              description: `Failed to remove "${
                dup.url.title || dup.url.url
              }". Please try again.`,
              variant: "error",
            });
          } finally {
            setDuplicateDeletePending(false);
            setDeletingDuplicateIds((prev) => {
              const next = new Set(prev);
              next.delete(dup.url.id);
              return next;
            });
          }
        }}
      />
    </>
  );
}
