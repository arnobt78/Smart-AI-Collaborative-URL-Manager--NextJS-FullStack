"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { currentList, type UrlList, type UrlItem } from "@/stores/urlListStore";
import { queryClient } from "@/lib/react-query";
import { useToast } from "@/components/ui/Toaster";
import {
  invalidateCollaboratorQueries,
  invalidateUrlQueries,
  invalidateAllListsQueries,
  invalidateListQueries,
  invalidateBrowseQueries,
} from "@/utils/queryInvalidation";
import { devLog, devWarn } from "@/lib/dev-log";

// ============================================
// QUERY KEYS - Centralized for consistency
// ============================================
export const listQueryKeys = {
  // List queries
  all: ["lists"] as const,
  lists: () => [...listQueryKeys.all, "list"] as const,
  list: (id: string) => [...listQueryKeys.lists(), id] as const,
  listBySlug: (slug: string) =>
    [...listQueryKeys.lists(), "slug", slug] as const,

  // Unified list data
  unified: (slug: string) => ["unified-list", slug] as const,

  // Activities
  activities: (listId: string, limit?: number) =>
    ["activities", listId, limit || 30] as const,

  // Collaborators
  collaborators: (listId: string) => ["collaborators", listId] as const,

  // Collections
  collections: (listId: string) => ["collections-suggestions", listId] as const,
  duplicates: (listId: string) => ["collections-duplicates", listId] as const,

  // URL metadata
  urlMetadata: (url: string) => ["url-metadata", url] as const,

  // User's all lists
  allLists: () => [...listQueryKeys.all, "all"] as const,
};

// ============================================
// UNIFIED LIST QUERY (Initial Page Load)
// ============================================
interface UnifiedListData {
  list: UrlList | null;
  activities: Array<{
    id: string;
    action: string;
    details: Record<string, unknown> | null;
    createdAt: string;
    user: { id: string; email: string };
  }>;
  collaborators?: Array<{ email: string; role: "editor" | "viewer" }>;
  commentCounts?: Record<string, number>;
}

export function useUnifiedListQuery(slug: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  return useQuery<UnifiedListData>({
    queryKey: listQueryKeys.unified(slug),
    queryFn: async () => {
      const response = await fetch(
        `/api/lists/${slug}/updates?activityLimit=30`
      );
      if (!response.ok) {
        if (response.status === 401) {
          // CRITICAL: Get list ID from current list store if available
          // This ensures the event has the correct listId for matching in ListPage
          const current = currentList.get();
          const listId = current?.id || slug; // Fallback to slug if ID not available

          window.dispatchEvent(
            new CustomEvent("unified-update-unauthorized", {
              detail: { listId, slug },
            })
          );
          return { list: null, activities: [], collaborators: [] };
        }
        // CRITICAL: Handle 404 (list not found/deleted) by returning null list
        // This ensures ListPage shows "List not found" instead of error
        if (response.status === 404) {
          return { list: null, activities: [], collaborators: [] };
        }
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();

      const commentCounts: Record<string, number> = data.commentCounts || {};
      const list = data.list
        ? {
            ...data.list,
            urls: data.list.urls.map((url: UrlItem) => ({
              ...url,
              commentCount: commentCounts[url.id] || 0,
            })),
          }
        : null;

      // Update store immediately with the same complete data returned to callers.
      if (list) {
        currentList.set(list);
      }

      // Populate React Query cache for collaborators
      if (list?.id && data.collaborators) {
        queryClient.setQueryData(listQueryKeys.collaborators(list.id), {
          collaborators: data.collaborators,
        });
      }

      // Dispatch events for components
      if (list?.id) {
        window.dispatchEvent(
          new CustomEvent("unified-activities-updated", {
            detail: {
              listId: list.id,
              activities: data.activities || [],
            },
          })
        );

        window.dispatchEvent(
          new CustomEvent("unified-collaborators-updated", {
            detail: {
              listId: list.id,
              collaborators: data.collaborators || [],
            },
          })
        );
      }

      return {
        list,
        activities: data.activities || [],
        collaborators: data.collaborators || [],
        commentCounts,
      };
    },
    enabled: enabled && !!slug,
    // CRITICAL: Cache forever until invalidated (after mutations/SSE)
    // With staleTime: Infinity, data never becomes stale automatically
    // Only becomes stale when manually invalidated, then refetches once
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts (matches default)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    // CRITICAL: Refetch only when stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    // Normal navigation uses cache instantly (no API calls)
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchOnReconnect: false, // Don't refetch on reconnect
    // Same-list refetch only — never reuse another slug's list as placeholder (wrong-list bug)
    placeholderData: (previousData) =>
      previousData?.list?.slug === slug ? previousData : undefined,
  });
}

// ============================================
// COLLABORATORS MUTATIONS
// ============================================
export function useAddCollaborator(listId: string, listSlug?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: "editor" | "viewer";
    }) => {
      // Use slug if available, otherwise use ID
      const identifier = listSlug || listId;
      const response = await fetch(`/api/lists/${identifier}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add collaborator");
      }
      return response.json();
    },
    onMutate: async ({ email, role }) => {
      // Optimistic update
      const queryKey = listQueryKeys.collaborators(listId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<{
        collaborators: Array<{ email: string; role: string }>;
      }>(queryKey);

      queryClient.setQueryData<{
        collaborators: Array<{ email: string; role: string }>;
      }>(queryKey, (old) => {
        const existing = old?.collaborators || [];
        const trimmedEmail = email.trim().toLowerCase();
        const exists = existing.some(
          (c) => c.email.toLowerCase() === trimmedEmail
        );

        if (exists) {
          return {
            collaborators: existing.map((c) =>
              c.email.toLowerCase() === trimmedEmail ? { ...c, role } : c
            ),
          };
        }

        return {
          collaborators: [...existing, { email: email.trim(), role }],
        };
      });

      return { previous };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Collaborator Added! ✅",
        description: `${variables.email.trim()} has been added as ${
          variables.role
        }.${data.emailSent ? " An invitation email has been sent." : ""}`,
        variant: "success",
      });

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query and all lists query
      if (listSlug) {
        // Invalidate on owner's screen immediately
        invalidateCollaboratorQueries(queryClient, listSlug);

        // NOTE: We don't dispatch unified-update event here because:
        // 1. Owner screen already updated via invalidateCollaboratorQueries
        // 2. SSE will send list_updated event which will trigger unified-update on collaborator screens
        // 3. This prevents duplicate invalidations (direct + unified-update event)
        // The SSE event from the server is the single source of truth for real-time updates
      }
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          listQueryKeys.collaborators(listId),
          context.previous
        );
      }

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add collaborator",
        variant: "error",
      });
    },
  });
}

export function useUpdateCollaboratorRole(listId: string, listSlug?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: "editor" | "viewer";
    }) => {
      // Use slug if available, otherwise use ID
      const identifier = listSlug || listId;
      const response = await fetch(`/api/lists/${identifier}/collaborators`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }
      return response.json();
    },
    onMutate: async ({ email, role }) => {
      const queryKey = listQueryKeys.collaborators(listId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<{
        collaborators: Array<{ email: string; role: string }>;
      }>(queryKey);

      queryClient.setQueryData<{
        collaborators: Array<{ email: string; role: string }>;
      }>(queryKey, (old) => {
        const existing = old?.collaborators || [];
        const emailLower = email.toLowerCase();
        return {
          collaborators: existing.map((c) =>
            c.email.toLowerCase() === emailLower ? { ...c, role } : c
          ),
        };
      });

      return { previous };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Role Updated! ✅",
        description: `${variables.email} is now a ${variables.role}.`,
        variant: "success",
      });

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query and all lists query
      if (listSlug) {
        // Invalidate on owner's screen immediately
        invalidateCollaboratorQueries(queryClient, listSlug);

        // NOTE: We don't dispatch unified-update event here because:
        // 1. Owner screen already updated via invalidateCollaboratorQueries
        // 2. SSE will send list_updated event which will trigger unified-update on collaborator screens
        // 3. This prevents duplicate invalidations (direct + unified-update event)
        // The SSE event from the server is the single source of truth for real-time updates
      }
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          listQueryKeys.collaborators(listId),
          context.previous
        );
      }

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update role",
        variant: "error",
      });
    },
  });
}

export function useRemoveCollaborator(listId: string, listSlug?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (email: string) => {
      // Use slug if available, otherwise use ID
      const identifier = listSlug || listId;
      const response = await fetch(
        `/api/lists/${identifier}/collaborators?email=${encodeURIComponent(
          email
        )}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove collaborator");
      }
      return response.json();
    },
    onMutate: async (email) => {
      const queryKey = listQueryKeys.collaborators(listId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<{
        collaborators: Array<{ email: string; role: string }>;
      }>(queryKey);

      queryClient.setQueryData<{
        collaborators: Array<{ email: string; role: string }>;
      }>(queryKey, (old) => {
        const existing = old?.collaborators || [];
        const emailLower = email.toLowerCase();
        return {
          collaborators: existing.filter(
            (c) => c.email.toLowerCase() !== emailLower
          ),
        };
      });

      return { previous };
    },
    onSuccess: (data, email) => {
      toast({
        title: "Collaborator Removed",
        description: `${email} has been removed from this list.`,
        variant: "success",
      });

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query and all lists query
      if (listSlug) {
        // Invalidate on owner's screen immediately
        invalidateCollaboratorQueries(queryClient, listSlug);

        // NOTE: We don't dispatch unified-update event here because:
        // 1. Owner screen already updated via invalidateCollaboratorQueries
        // 2. SSE will send list_updated event which will trigger unified-update on collaborator screens
        // 3. This prevents duplicate invalidations (direct + unified-update event)
        // The SSE event from the server is the single source of truth for real-time updates
      }
    },
    onError: (error, email, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          listQueryKeys.collaborators(listId),
          context.previous
        );
      }

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to remove collaborator",
        variant: "error",
      });
    },
  });
}

// ============================================
// URL MUTATIONS
// ============================================
export function useAddUrl(listId: string, listSlug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (urlData: {
      url: string;
      title?: string;
      tags?: string[];
      notes?: string;
      reminder?: string;
      category?: string;
    }) => {
      const response = await fetch(`/api/lists/${listSlug}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(urlData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add URL");
      }
      return response.json();
    },
    onMutate: async (urlData) => {
      // Optimistic update - add to store immediately
      const current = currentList.get();
      if (current?.id === listId && current.urls) {
        const urls = current.urls as unknown as UrlItem[];
        const newUrl: UrlItem = {
          id: crypto.randomUUID(),
          url: urlData.url,
          title: urlData.title,
          tags: urlData.tags || [],
          notes: urlData.notes || "",
          reminder: urlData.reminder,
          category: urlData.category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
          clickCount: 0,
          position: urls.length,
        };

        currentList.set({
          ...current,
          urls: [...urls, newUrl],
        });
      }

      // Cancel queries to prevent overwriting
      await queryClient.cancelQueries({
        queryKey: listQueryKeys.unified(listSlug),
      });
    },
    onSuccess: (data) => {
      // Update store with server response
      if (data.list) {
        currentList.set(data.list);
      }

      // CRITICAL: Dispatch activity-added event for immediate activity feed update
      // This provides instant feedback before unified query refetch completes
      if (typeof window !== "undefined" && data.activity && data.list?.id) {
        try {
          window.dispatchEvent(
            new CustomEvent("activity-added", {
              detail: {
                listId: data.list.id,
                activity: {
                  id: data.activity.id,
                  action: data.activity.action,
                  details: data.activity.details,
                  createdAt: data.activity.createdAt,
                  user: data.activity.user || { id: "", email: "" },
                },
              },
            })
          );
        } catch {
          // Ignore errors - unified query refetch will handle it
        }
      }

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query, all lists, collections, and duplicates
      // Unified query refetch will provide the complete activity list
      invalidateUrlQueries(queryClient, listSlug, listId, false);

      toast({
        title: "URL Added! ✅",
        description: "The URL has been added to your list.",
        variant: "success",
      });
    },
    onError: (error) => {
      // Rollback - refetch to get correct state using centralized invalidation
      invalidateListQueries(queryClient, listSlug, listId);

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add URL",
        variant: "error",
      });
    },
  });
}

export function useDeleteUrl(listId: string, listSlug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (urlId: string) => {
      const response = await fetch(
        `/api/lists/${listSlug}/urls?urlId=${urlId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete URL");
      }
      return response.json();
    },
    onMutate: async (urlId) => {
      // Optimistic update
      const current = currentList.get();
      if (current?.id === listId && current.urls) {
        const urls = current.urls as unknown as UrlItem[];
        const filtered = urls.filter((u) => u.id !== urlId);

        currentList.set({
          ...current,
          urls: filtered,
        });
      }

      await queryClient.cancelQueries({
        queryKey: listQueryKeys.unified(listSlug),
      });

      const previous = currentList.get();
      return { previous };
    },
    onSuccess: (data) => {
      // Update store with server response
      if (data.list) {
        currentList.set(data.list);
      }

      // CRITICAL: Dispatch activity-added event for immediate activity feed update
      // This provides instant feedback before unified query refetch completes
      if (typeof window !== "undefined" && data.activity && data.list?.id) {
        try {
          window.dispatchEvent(
            new CustomEvent("activity-added", {
              detail: {
                listId: data.list.id,
                activity: {
                  id: data.activity.id,
                  action: data.activity.action,
                  details: data.activity.details,
                  createdAt: data.activity.createdAt,
                  user: data.activity.user || { id: "", email: "" },
                },
              },
            })
          );
        } catch {
          // Ignore errors - unified query refetch will handle it
        }
      }

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query, all lists, collections, and duplicates
      // Unified query refetch will provide the complete activity list
      invalidateUrlQueries(queryClient, listSlug, listId, false);

      const deletedUrl = data.deletedUrl;
      toast({
        title: "URL Removed",
        description: `"${
          deletedUrl?.title || deletedUrl?.url || "URL"
        }" has been removed.`,
        variant: "success",
      });
    },
    onError: (error, urlId, context) => {
      // Rollback
      if (context?.previous) {
        currentList.set(context.previous);
      }

      // Rollback - refetch to get correct state using centralized invalidation
      invalidateListQueries(queryClient, listSlug, listId);

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete URL",
        variant: "error",
      });
    },
  });
}

export function useUpdateUrl(listId: string, listSlug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      urlId,
      updates,
    }: {
      urlId: string;
      updates: Partial<UrlItem>;
    }) => {
      const response = await fetch(`/api/lists/${listSlug}/urls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlId, ...updates }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update URL");
      }
      return response.json();
    },
    onMutate: async ({ urlId, updates }) => {
      // Optimistic update
      const current = currentList.get();
      if (current?.id === listId && current.urls) {
        const urls = current.urls as unknown as UrlItem[];
        const updated = urls.map((u) =>
          u.id === urlId
            ? { ...u, ...updates, updatedAt: new Date().toISOString() }
            : u
        );

        currentList.set({
          ...current,
          urls: updated,
        });
      }

      await queryClient.cancelQueries({
        queryKey: listQueryKeys.unified(listSlug),
      });
    },
    onSuccess: (data) => {
      if (data.list) {
        currentList.set(data.list);
      }

      // CRITICAL: Dispatch activity-added event for immediate activity feed update
      // This provides instant feedback before unified query refetch completes
      if (typeof window !== "undefined" && data.activity && data.list?.id) {
        try {
          // Dispatch activity-added event for optimistic activity feed update
          window.dispatchEvent(
            new CustomEvent("activity-added", {
              detail: {
                listId: data.list.id,
                activity: {
                  id: data.activity.id,
                  action: data.activity.action,
                  details: data.activity.details,
                  createdAt: data.activity.createdAt,
                  user: data.activity.user || {
                    id: "",
                    email: "",
                  },
                },
              },
            })
          );
        } catch {
          // Ignore errors - unified query refetch will handle it
        }
      }

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query, all lists, collections, and duplicates
      // Unified query refetch will provide the complete activity list
      invalidateUrlQueries(queryClient, listSlug, listId, false);

      toast({
        title: "URL Updated! ✅",
        description: "The URL has been updated successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      // Rollback - refetch to get correct state using centralized invalidation
      invalidateListQueries(queryClient, listSlug, listId);

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update URL",
        variant: "error",
      });
    },
  });
}

// ============================================
// ALL LISTS QUERY (ListsPage)
// ============================================
export interface UserList {
  id: string;
  slug: string;
  title: string | null;
  description?: string | null;
  urls?: Array<{ id: string; url: string; title?: string }>;
  created_at?: string;
  createdAt?: string | Date;
  updated_at?: string;
  updatedAt?: string | Date;
  isPublic?: boolean;
  collaborators?: string[];
}

export function useAllListsQuery() {
  return useQuery<{ lists: UserList[] }>({
    queryKey: listQueryKeys.allLists(),
    queryFn: async () => {
      const response = await fetch("/api/lists");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error(`Failed to fetch lists: ${response.status}`);
      }
      const data = await response.json();
      return { lists: data.lists || [] };
    },
    // CRITICAL: Cache forever until invalidated (after mutations/SSE)
    // With staleTime: Infinity, data never becomes stale automatically
    // Only becomes stale when manually invalidated, then refetches once
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts (matches default)
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    // CRITICAL: Refetch only when stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    // Normal navigation uses cache instantly (no API calls)
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    refetchInterval: false, // Disable automatic refetching - SSE events handle updates
    retry: 1,
    // CRITICAL: Use stale data immediately if available, fetch fresh in background
    placeholderData: (previousData) => previousData, // Keep previous data visible while refetching
  });
}

// ============================================
// DELETE LIST MUTATION
// ============================================
export function useDeleteList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (listId: string) => {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete list");
      }
      return response.json();
    },
    onMutate: async (listId) => {
      // Optimistic update - remove from cache immediately
      await queryClient.cancelQueries({ queryKey: listQueryKeys.allLists() });

      const previous = queryClient.getQueryData<{ lists: UserList[] }>(
        listQueryKeys.allLists()
      );

      // Get list details before removing from cache (needed for invalidation and toast)
      const deletedList = previous?.lists?.find((l) => l.id === listId);
      const listTitle = deletedList?.title || deletedList?.slug || "List";
      const listSlug = deletedList?.slug;

      queryClient.setQueryData<{ lists: UserList[] }>(
        listQueryKeys.allLists(),
        (old) => {
          if (!old?.lists) return old;
          return {
            lists: old.lists.filter((list) => list.id !== listId),
          };
        }
      );

      return {
        previous,
        deletedListTitle: listTitle,
        deletedListSlug: listSlug,
      };
    },
    onSuccess: (data, listId, context) => {
      // CRITICAL: Invalidate all list-related queries to ensure consistency across all pages
      // This includes user's lists page, browse/public lists page, and individual list pages
      invalidateAllListsQueries(queryClient);

      // CRITICAL: Also invalidate browse/public lists queries to remove deleted list from browse page
      // When a list is deleted, it should disappear from both user's lists AND public browse page
      invalidateBrowseQueries(queryClient);

      // CRITICAL: Invalidate unified query for this specific list to ensure list page shows "not found"
      // This ensures that if someone navigates to the deleted list's URL, they see proper 404/not found
      if (context?.deletedListSlug) {
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(context.deletedListSlug),
        });
      }

      // Use list title from context (captured before deletion)
      const listTitle = context?.deletedListTitle || "List";

      toast({
        title: "List Deleted 🗑️",
        description: `"${listTitle}" has been successfully deleted.`,
        variant: "success",
      });
    },
    onError: (error, listId, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(listQueryKeys.allLists(), context.previous);
      }

      toast({
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete list",
        variant: "error",
      });
    },
  });
}

// ============================================
// SSE CACHE UPDATES - Real-time sync
// ============================================
// CRITICAL: Singleton pattern to ensure only one listener exists globally
// This prevents duplicate invalidations when multiple components call setupSSECacheSync
let listenerRefCount = 0; // Track how many components are using this
let globalInvalidationTimeout: NodeJS.Timeout | null = null;
const globalProcessedInvocations = new Set<string>(); // Shared deduplication across all instances
let globalSSEConnectedTime: number | null = null; // Track when SSE actually connects
let globalHandler: ((event: Event) => void) | null = null;
let globalSSEConnectedHandler: ((event: Event) => void) | null = null;
const invalidationDelay = 300; // 300ms debounce window
const initialLoadGracePeriod = 8000; // Ignore invalidations for 8 seconds after SSE connects (to handle slow SSE connections)

/**
 * Setup global SSE cache sync for React Query
 *
 * This is a singleton - only one listener will be created globally, even if called multiple times.
 * Uses ref counting to ensure listener is only removed when last component unmounts.
 * This prevents duplicate invalidations when multiple components mount.
 *
 * @returns Cleanup function
 */
export function setupSSECacheSync() {
  if (typeof window === "undefined") {
    return () => {}; // Return no-op cleanup on server
  }

  // Increment ref count
  listenerRefCount++;

  // CRITICAL: Only set up listener once globally - singleton pattern
  if (listenerRefCount === 1) {

    const handleUnifiedUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        action?: string;
        slug?: string;
        timestamp?: string;
      }>;

      const listId = customEvent.detail?.listId;
      const slug = customEvent.detail?.slug;
      const action = customEvent.detail?.action || "";
      const eventTimestamp = customEvent.detail?.timestamp;

      const timeSinceSSEConnect = globalSSEConnectedTime
        ? Date.now() - globalSSEConnectedTime
        : null;
      devLog(`📥 [SSE CACHE SYNC] Received unified-update event:`, {
        listId,
        slug,
        action,
        eventTimestamp,
        timeSinceSSEConnect,
        isCollaboratorAction:
          action === "collaborator_added" ||
          action === "collaborator_role_updated" ||
          action === "collaborator_removed",
      });

      if (!listId) {
        devWarn(
          `⚠️ [SSE CACHE SYNC] unified-update event missing listId, ignoring`
        );
        return;
      }

      // CRITICAL: For collaborator actions, check if event is recent (not historical)
      // Only bypass grace period for recent collaborator events (within last 60 seconds)
      // This ensures role updates are immediately reflected, but historical events are ignored
      const isCollaboratorAction =
        action === "collaborator_added" ||
        action === "collaborator_role_updated" ||
        action === "collaborator_removed";

      const now = Date.now();
      let shouldIgnoreGracePeriod = false;

      if (isCollaboratorAction) {
        // CRITICAL: For collaborator actions, check if event is recent based on timestamp
        // If event timestamp is recent (within last 60 seconds), it's a real-time update - process immediately
        // If no timestamp or old timestamp, check if we're still in grace period
        if (eventTimestamp) {
          try {
            const eventTime = new Date(eventTimestamp).getTime();
            const timeSinceEvent = now - eventTime;

            // If event is recent (within last 60 seconds), it's real-time - bypass grace period
            if (timeSinceEvent < 60000) {
              shouldIgnoreGracePeriod = true;
              devLog(
                `✅ [SSE CACHE SYNC] Recent collaborator action (${timeSinceEvent}ms ago, ${Math.round(
                  timeSinceEvent / 1000
                )}s) - bypassing grace period (action: ${action})`
              );
            } else {
              // Event is old (historical) - only bypass grace period if we're past the grace period
              // This prevents processing historical events during initial load
              if (globalSSEConnectedTime !== null) {
                const timeSinceSSEConnect = now - globalSSEConnectedTime;
                if (timeSinceSSEConnect >= initialLoadGracePeriod) {
                  // Past grace period, safe to process even old events
                  shouldIgnoreGracePeriod = true;
                  devLog(
                    `✅ [SSE CACHE SYNC] Historical collaborator action but past grace period (${timeSinceSSEConnect}ms since SSE connect) - processing (action: ${action})`
                  );
                } else {
                  // Still in grace period and event is old - ignore it
                  devLog(
                    `⏭️ [SSE CACHE SYNC] Historical collaborator action during grace period (${timeSinceEvent}ms old, ${timeSinceSSEConnect}ms since SSE connect) - ignoring (action: ${action})`
                  );
                }
              }
            }
          } catch {
            // Invalid timestamp - treat as recent collaborator action (might be from mutation)
            shouldIgnoreGracePeriod = true;
            devLog(
              `✅ [SSE CACHE SYNC] Collaborator action with invalid timestamp - treating as recent, bypassing grace period (action: ${action})`
            );
          }
        } else {
          // No timestamp - treat as recent collaborator action (likely from mutation dispatch)
          shouldIgnoreGracePeriod = true;
          devLog(
            `✅ [SSE CACHE SYNC] Collaborator action without timestamp - treating as recent, bypassing grace period (action: ${action})`
          );
        }
      }

      // CRITICAL: Ignore events during initial load grace period (unless it's a recent collaborator action)
      // Use SSE connection time (not setup time) to accurately track when historical events arrive
      // This prevents rapid invalidations when SSE first connects and sends historical events
      if (!shouldIgnoreGracePeriod && globalSSEConnectedTime !== null) {
        const timeSinceSSEConnect = now - globalSSEConnectedTime;

        if (timeSinceSSEConnect < initialLoadGracePeriod) {
          devLog(
            `⏭️ [SSE CACHE SYNC] Ignoring unified-update event during initial load grace period (${timeSinceSSEConnect}ms since SSE connect, action: ${action})`
          );
          return;
        }
      }

      // CRITICAL: Get slug from currentList store if not provided in event
      // This ensures we can invalidate the unified query even if slug is missing from event
      let listSlug = slug;
      if (!listSlug && typeof window !== "undefined") {
        const current = currentList.get();
        if (current?.id === listId && current?.slug) {
          listSlug = current.slug;
        }
      }

      if (!listSlug) {
        devWarn(
          `⚠️ [SSE CACHE SYNC] Cannot invalidate - no slug found (listId: ${listId}, slug: ${slug})`
        );
        return;
      }

      // CRITICAL: Create unique invocation key to prevent duplicate invalidations
      // Use listSlug + action + rounded timestamp to deduplicate events within 1 second
      // This prevents duplicate invalidations from mutation dispatch + SSE events with slightly different timestamps
      let invocationKey: string;
      if (eventTimestamp) {
        try {
          // Round timestamp to nearest second to deduplicate events within 1 second
          const eventTime = new Date(eventTimestamp).getTime();
          const roundedTime = Math.floor(eventTime / 1000) * 1000; // Round to nearest second
          invocationKey = `${listSlug}:${action}:${roundedTime}`;
        } catch {
          // If timestamp parsing fails, use current time rounded to nearest second
          const roundedTime = Math.floor(Date.now() / 1000) * 1000;
          invocationKey = `${listSlug}:${action}:${roundedTime}`;
        }
      } else {
        // No timestamp - use current time rounded to nearest second
        const roundedTime = Math.floor(Date.now() / 1000) * 1000;
        invocationKey = `${listSlug}:${action}:${roundedTime}`;
      }

      // Skip if we've already processed this exact event recently (shared across all instances)
      if (globalProcessedInvocations.has(invocationKey)) {
        devLog(
          `⏭️ [SSE CACHE SYNC] Skipping duplicate unified-update event (deduplicated by rounded timestamp): ${invocationKey}`
        );
        return;
      }

      // Add to processed set and clean up old entries (keep last 100 for better deduplication)
      globalProcessedInvocations.add(invocationKey);
      if (globalProcessedInvocations.size > 100) {
        const entries = Array.from(globalProcessedInvocations);
        globalProcessedInvocations.clear();
        entries
          .slice(-100)
          .forEach((key) => globalProcessedInvocations.add(key));
      }

      // Debounce invalidation to prevent rapid-fire API calls (shared timeout across all instances)
      // Clear existing timeout if another event comes in quickly
      if (globalInvalidationTimeout) {
        clearTimeout(globalInvalidationTimeout);
      }

      globalInvalidationTimeout = setTimeout(() => {
        // CRITICAL: Invalidate unified query to trigger refetch
        // This ensures collaborators see real-time updates (SSE -> unified-update event -> invalidation -> refetch)
        devLog(
          `🔄 [SSE CACHE SYNC] Invalidating unified query for: ${listSlug} (action: ${action})`
        );
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.unified(listSlug!),
        });
        globalInvalidationTimeout = null;
        devLog(
          `✅ [SSE CACHE SYNC] Unified query invalidated, refetch should trigger updates?activityLimit=30`
        );
      }, invalidationDelay);
    };

    // Store handler globally for cleanup
    globalHandler = handleUnifiedUpdate;
    window.addEventListener("unified-update", handleUnifiedUpdate);

    // CRITICAL: Listen for SSE connection events to track when SSE actually connects
    // This allows grace period to start from actual SSE connection time (not setup time)
    // This prevents invalidations from historical events sent right after SSE connects
    const handleSSEConnected = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        timestamp?: number;
      }>;

      // Set global SSE connection time (use timestamp from event or current time)
      if (!globalSSEConnectedTime) {
        globalSSEConnectedTime = customEvent.detail?.timestamp || Date.now();
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `✅ [SSE CACHE SYNC] SSE connected, starting grace period from now`
          );
        }
      }
    };

    window.addEventListener("sse-connected", handleSSEConnected);

    // Store handler for cleanup
    globalSSEConnectedHandler = handleSSEConnected;
  }

  // Return cleanup function that decrements ref count
  return () => {
    listenerRefCount--;

    // Only remove listener and cleanup when no components are using it
    if (listenerRefCount <= 0) {
      if (globalHandler) {
        window.removeEventListener("unified-update", globalHandler);
        // Also remove SSE connected listener if it exists
        if (globalSSEConnectedHandler) {
          window.removeEventListener("sse-connected", globalSSEConnectedHandler);
          globalSSEConnectedHandler = null;
        }
        globalHandler = null;
      }
      if (globalInvalidationTimeout) {
        clearTimeout(globalInvalidationTimeout);
        globalInvalidationTimeout = null;
      }
      // Don't clear processedInvocations - keep them for deduplication
      // Don't reset globalSetupTime or globalSSEConnectedTime - keep them for grace period tracking
      listenerRefCount = 0; // Reset to 0 (safety)
    }
  };
}
