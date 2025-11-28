"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  Copy,
  AlertTriangle,
  Loader2,
  X,
  CheckCircle2,
  Search,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@/components/ui/AlertDialog";

interface SmartCollectionsProps {
  listId: string;
  listSlug: string;
}

export function SmartCollections({ listId, listSlug }: SmartCollectionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const list = useStore(currentList);
  const permissions = useListPermissions(); // Get permissions for role-based access control
  const queryClient = useQueryClient();
  const componentMountedRef = useRef<number>(Date.now()); // Track when component mounted

  // OPTIMIZATION: Use React Query for collection suggestions with automatic caching
  // React Query handles browser session caching, memoization, and background refetching
  // CRITICAL: Defer fetch until after page is visible to avoid blocking initial render
  const [shouldFetchCollections, setShouldFetchCollections] = useState(false);

  useEffect(() => {
    // Defer collections fetch by 3 seconds to let page render first
    const timer = setTimeout(() => {
      setShouldFetchCollections(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const {
    data: suggestionsData,
    isLoading: isLoadingSuggestions,
    refetch: refetchSuggestions,
  } = useQuery<{ suggestions: CollectionSuggestion[] }>({
    queryKey: [...listQueryKeys.collections(listId), list?.urls?.length],
    queryFn: async () => {
      if (!listSlug) {
        throw new Error("List slug required");
      }
      const response = await fetch(
        `/api/lists/${listSlug}/collections?includeDuplicates=false&minGroupSize=2&maxCollections=10`
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
    enabled:
      shouldFetchCollections &&
      !!listSlug &&
      !!list?.urls &&
      list.urls.length >= 2,
    staleTime: 60 * 60 * 1000, // 1 hour - suggestions stay fresh for 1 hour (server cache is also 1 hour)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - cache kept for 2 hours in browser session
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    refetchOnMount: false, // CRITICAL: Use cache if available, don't block page load
    retry: false, // Don't retry on error (let user manually refresh)
    // CRITICAL: Defer fetch until after page is visible - don't block initial render
    // Use cached data immediately if available
    placeholderData: (previousData) => previousData,
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
        `/api/lists/${listSlug}/collections?includeDuplicates=true&minGroupSize=2&maxCollections=10`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch duplicates");
      }
      const data = await response.json();
      return { duplicates: data.duplicates || [] };
    },
    enabled: shouldFetchDuplicates && !!listSlug && !!list?.urls, // Only fetch when explicitly requested
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes (allows refetch on demand but uses cache)
    gcTime: 10 * 60 * 1000, // 10 minutes - cache kept for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry on error to prevent infinite loops
    // React Query will use cached data if available, preventing duplicate API calls
  });

  const duplicates = duplicatesData?.duplicates || [];
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [deletingDuplicateIds, setDeletingDuplicateIds] = useState<Set<string>>(
    new Set()
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteDuplicate, setPendingDeleteDuplicate] =
    useState<DuplicateDetection | null>(null);

  // Track last invalidation time and event IDs to prevent duplicate API calls
  const lastInvalidationRef = useRef<number>(0);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const INVALIDATION_DEBOUNCE_MS = 1000; // Debounce invalidations by 1 second

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

    try {
      // Clear server-side Redis cache first (use GET with clearCache=true, not DELETE)
      try {
        await fetch(
          `/api/lists/${listSlug}/collections?clearCache=true&_t=${Date.now()}`
        );
      } catch (error) {
        // Ignore cache clear errors
      }

      // Clear React Query cache and force refetch
      queryClient.removeQueries({
        queryKey: listQueryKeys.collections(listId),
      });

      // Force refetch with cache-busting
      const result = await refetchSuggestions();

      // Show success toast with dynamic message based on result
      const refreshedSuggestions = result.data?.suggestions || [];
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
    }
  }, [
    listSlug,
    list?.urls,
    listId,
    suggestions.length,
    toast,
    queryClient,
    refetchSuggestions,
  ]);

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
        if (response.status === 401) {
          return; // Unauthorized - handled elsewhere
        }
        const error = await response.json();
        throw new Error(error.error || "Failed to create collection");
      }

      const data = await response.json();

      toast({
        title: "Collection Created",
        description: `Created "${suggestion.name}" with ${suggestion.urls.length} URLs`,
        variant: "success",
      });

      // Invalidate React Query cache to refresh list data and remove created suggestion
      queryClient.invalidateQueries({
        queryKey: listQueryKeys.unified(listSlug),
      });
      queryClient.invalidateQueries({ queryKey: listQueryKeys.allLists() });
      queryClient.setQueryData<{ suggestions: CollectionSuggestion[] }>(
        [...listQueryKeys.collections(listId), list?.urls?.length],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            suggestions: oldData.suggestions.filter(
              (s) => s.id !== suggestion.id
            ),
          };
        }
      );

      // Navigate to new collection using Next.js router
      if (data.collection?.slug) {
        setTimeout(() => {
          router.push(`/list/${data.collection.slug}`);
        }, 1000);
      }
    } catch (error) {
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
      } else if (process.env.NODE_ENV === "development") {
        // Silently handle expected errors (no console spam)
        console.debug(
          "⏭️ [COLLECTIONS] Create request aborted (expected during page refresh)"
        );
      }
    } finally {
      setIsCreating(null);
    }
  };

  if (!list?.urls || list.urls.length < 2) {
    return null; // Don't show if not enough URLs
  }

  const hasSuggestions = suggestions.length > 0;
  const hasDuplicates = duplicates.length > 0;

  if (!isExpanded && !isLoading && !hasSuggestions && !hasDuplicates) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="font-semibold text-white">Smart Collections</h3>
                <p className="text-sm text-white/60">
                  Get AI-powered collection suggestions
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Explore
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <div>
              <CardTitle>Smart Collections</CardTitle>
              <CardDescription>
                AI-powered suggestions to organize your URLs
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Collection Suggestions */}
        {!isLoading && hasSuggestions && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Suggested Collections ({suggestions.length})
            </h4>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold text-white truncate">
                          {suggestion.name}
                        </h5>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.urls.length} URLs
                        </Badge>
                        {suggestion.category && (
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-white/60 mb-2">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>Confidence: {suggestion.confidence}%</span>
                        <span>•</span>
                        <span className="truncate">{suggestion.reason}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Prevent action if viewer (disabled state)
                        if (!permissions.canEdit) return;
                        createCollection(suggestion);
                      }}
                      disabled={
                        isCreating === suggestion.id || !permissions.canEdit
                      }
                      className={`shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-0 ${
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
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Create
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
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                {isLoadingDuplicates
                  ? "Checking for duplicates..."
                  : hasDuplicates
                  ? `Duplicate URLs (${duplicates.length})`
                  : "No duplicates found"}
              </h4>
              {!isLoadingDuplicates && hasDuplicates && (
                <button
                  type="button"
                  onClick={() => setShowDuplicates(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Hide
                </button>
              )}
            </div>
            {isLoadingDuplicates && (
              <div className="text-center py-4">
                <Loader2 className="h-5 w-5 text-white/40 mx-auto animate-spin" />
                <p className="text-xs text-white/50 mt-2">
                  Checking URLs for duplicates...
                </p>
              </div>
            )}
            {!isLoadingDuplicates && hasDuplicates && (
              <div className="space-y-3">
                {duplicates.map((dup, idx) => {
                  const isDeleting = deletingDuplicateIds.has(dup.url.id);

                  return (
                    <div
                      key={`${dup.url.id}-${idx}`}
                      className="border border-yellow-400/20 rounded-lg p-4 bg-yellow-400/5"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {dup.url.title || dup.url.url}
                          </p>
                          <p className="text-xs text-white/60 truncate mt-1">
                            {dup.url.url}
                          </p>
                          <div className="mt-2 space-y-1">
                            {dup.duplicates.map((d, i) => (
                              <div
                                key={i}
                                className="text-xs text-white/70 flex items-center gap-2 flex-wrap"
                              >
                                <Copy className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  Also in:{" "}
                                  {d.listSlug ? (
                                    <button
                                      onClick={() => {
                                        router.push(`/list/${d.listSlug}`);
                                      }}
                                      className="underline hover:text-white transition-colors"
                                      title={`Open ${d.listTitle || "list"}`}
                                    >
                                      {d.listTitle || "Unknown List"}
                                    </button>
                                  ) : (
                                    <span>{d.listTitle || "Unknown List"}</span>
                                  )}{" "}
                                  ({Math.round(d.similarity * 100)}% similar)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {permissions.canEdit && (
                          <button
                            onClick={() => {
                              setPendingDeleteDuplicate(dup);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={isDeleting}
                            className="shrink-0 px-3 py-1.5 text-xs rounded-md border border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20 hover:border-red-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                            title="Remove this duplicate from current list"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-3 w-3" />
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
              <div className="text-center py-4 border border-green-400/20 rounded-lg bg-green-400/5">
                <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-white/70">
                  No duplicate URLs found across your lists!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State - Only show if no suggestions and duplicates section not expanded */}
        {!isLoading && !hasSuggestions && !showDuplicates && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 text-sm">
              No collection suggestions available yet.
              <br />
              Add more URLs to get AI-powered suggestions.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-4 gap-2">
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
                      description: "No duplicate URLs found across your lists!",
                      variant: "success",
                    });
                  }
                } catch (error) {
                  console.error("Failed to check duplicates:", error);
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
            className="inline-flex items-center justify-center rounded-md border border-white/20 bg-transparent px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-colors"
          >
            <Search
              className={`h-4 w-4 mr-2 ${
                isLoadingDuplicates ? "animate-spin" : ""
              }`}
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
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md border border-white/20 bg-transparent px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-colors"
          >
            <Loader2
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh Suggestions
          </button>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
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
        onConfirm={async () => {
          if (!pendingDeleteDuplicate) return;

          const dup = pendingDeleteDuplicate;
          setDeleteDialogOpen(false);
          setDeletingDuplicateIds((prev) => new Set(prev).add(dup.url.id));

          try {
            const response = await fetch(
              `/api/lists/${listSlug}/urls?urlId=${dup.url.id}`,
              {
                method: "DELETE",
              }
            );

            if (!response.ok) {
              throw new Error("Failed to remove duplicate");
            }

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
                  (d) => d.url.id !== dup.url.id
                );
                return { duplicates: filtered };
              }
            );

            // Trigger fresh duplicate check after deletion to re-check ALL remaining URLs
            // This ensures we discover new duplicates that were beyond the first 20 URLs
            if (showDuplicates && shouldFetchDuplicates) {
              // The query key includes list?.urls?.length, so when URL count changes,
              // React Query will treat it as a new query and fetch fresh data
              // Force a refetch to ensure we re-check all remaining URLs (not just first 20)
              setTimeout(() => {
                refetchDuplicates();
              }, 100); // Small delay to ensure list state has updated with new URL count
            }
            queryClient.invalidateQueries({
              queryKey: listQueryKeys.collections(listId),
            });

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

            setPendingDeleteDuplicate(null);
          } catch (error) {
            console.error("Failed to remove duplicate:", error);
            toast({
              title: "Error",
              description: `Failed to remove "${
                dup.url.title || dup.url.url
              }". Please try again.`,
              variant: "error",
            });
          } finally {
            setDeletingDuplicateIds((prev) => {
              const next = new Set(prev);
              next.delete(dup.url.id);
              return next;
            });
          }
        }}
      />
    </Card>
  );
}
