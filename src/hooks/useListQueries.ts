"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { currentList, type UrlList } from "@/stores/urlListStore";
import { queryClient } from "@/lib/react-query";
import { useToast } from "@/components/ui/Toaster";
import {
  densifyBrowsePublicLists,
  dropUnifiedListCache,
  invalidateMutationImpact,
  restoreBrowsePublicCaches,
  snapshotBrowsePublicCaches,
} from "@/utils/queryInvalidation";
import { devLog, devWarn } from "@/lib/dev-log";
import { listQueryKeys } from "@/lib/query-keys";
import {
  normalizeUnifiedListResponse,
  type UnifiedListResponse,
} from "@/lib/unified-list-response";

export { listQueryKeys } from "@/lib/query-keys";

// ============================================
// QUERY KEYS - Centralized for consistency
// ============================================
// ============================================
// UNIFIED LIST QUERY (Initial Page Load)
// ============================================
type UnifiedListData = UnifiedListResponse;

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
      const data = normalizeUnifiedListResponse(await response.json() as UnifiedListData);
      const { commentCounts, list } = data;

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
        // Clear soft-nav thin-seed marker after authoritative network fetch
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
        invalidateMutationImpact(queryClient, "collaborator", listSlug, listId);

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
        invalidateMutationImpact(queryClient, "collaborator", listSlug, listId);

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
        invalidateMutationImpact(queryClient, "collaborator", listSlug, listId);

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

export interface EditableList {
  id: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
}

export interface CreateListInput {
  title: string;
  slug: string;
  description: string | null;
  urls: Array<{ id: string; url: string }>;
  isPublic: boolean;
}

export interface UpdateListInput {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
}

type ListMutationResponse = { list: UrlList & UserList };

function patchAllListsCache(queryClient: ReturnType<typeof useQueryClient>, list: UserList, temporaryId?: string): void {
  queryClient.setQueryData<{ lists: UserList[] }>(listQueryKeys.allLists(), (current) => {
    if (!current) return current;
    const exists = current.lists.some((item) => item.id === list.id || item.id === temporaryId);
    const lists = exists
      ? current.lists.map((item) => (item.id === list.id || item.id === temporaryId ? { ...item, ...list } : item))
      : [list, ...current.lists];
    return { ...current, lists };
  });
}

function patchUnifiedListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  list: UrlList & UserList,
): void {
  queryClient.setQueryData<UnifiedListData>(listQueryKeys.unified(list.slug), (current) => {
    if (!current) {
      return { list, activities: [], collaborators: [], commentCounts: {} };
    }
    // Drop soft-nav thin-seed marker once real list fields are patched (C7.9)
    const { _softNavThinSeed: _drop, ...rest } = current as UnifiedListData & {
      _softNavThinSeed?: boolean;
    };
    return {
      ...rest,
      list: current.list ? { ...current.list, ...list } : list,
    };
  });

  const currentListValue = currentList.get();
  if (currentListValue.id === list.id) {
    currentList.set({ ...currentListValue, ...list });
  }
}

/** REQ-0021: Cache-aware list creation keeps the lists surface stable through success or rollback. */
export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateListInput): Promise<ListMutationResponse> => {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create list");
      }
      return response.json();
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: listQueryKeys.allLists() });
      const previous = queryClient.getQueryData<{ lists: UserList[] }>(listQueryKeys.allLists());
      const temporaryId = `temporary-list-${input.slug}`;
      patchAllListsCache(queryClient, {
        id: temporaryId,
        slug: input.slug,
        title: input.title,
        description: input.description,
        isPublic: input.isPublic,
        urls: input.urls,
      });
      return { previous, temporaryId };
    },
    onSuccess: (data, _input, context) => {
      patchAllListsCache(queryClient, data.list, context?.temporaryId);
      patchUnifiedListCache(queryClient, data.list);
      densifyBrowsePublicLists(queryClient, data.list);
      invalidateMutationImpact(queryClient, "list", data.list.slug, data.list.id);
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listQueryKeys.allLists(), context.previous);
      }
    },
  });
}

/** REQ-0021: Cache-aware list updates patch both list and detail surfaces before reconciliation. */
export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, slug: _slug, ...updates }: UpdateListInput): Promise<ListMutationResponse> => {
      const response = await fetch(`/api/lists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update list");
      }
      return response.json();
    },
    onMutate: async (input) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listQueryKeys.allLists() }),
        queryClient.cancelQueries({ queryKey: listQueryKeys.unified(input.slug) }),
      ]);
      const previousLists = queryClient.getQueryData<{ lists: UserList[] }>(listQueryKeys.allLists());
      const previousUnified = queryClient.getQueryData<UnifiedListData>(listQueryKeys.unified(input.slug));
      const previousCurrent = currentList.get();
      const optimisticList = { ...input } as UrlList & UserList;
      patchAllListsCache(queryClient, optimisticList);
      patchUnifiedListCache(queryClient, optimisticList);
      return { previousLists, previousUnified, previousCurrent };
    },
    onSuccess: (data) => {
      patchAllListsCache(queryClient, data.list);
      patchUnifiedListCache(queryClient, data.list);
      densifyBrowsePublicLists(queryClient, data.list);
      invalidateMutationImpact(queryClient, "list", data.list.slug, data.list.id);
    },
    onError: (_error, input, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(listQueryKeys.allLists(), context.previousLists);
      }
      if (context?.previousUnified) {
        queryClient.setQueryData(listQueryKeys.unified(input.slug), context.previousUnified);
      }
      if (context?.previousCurrent?.id === input.id) {
        currentList.set(context.previousCurrent);
      }
    },
  });
}

/**
 * REQ-0025: Visibility changes commit to every visible list surface before
 * the request resolves, then reconcile once through the shared impact map.
 */
export function useUpdateListVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; slug: string; isPublic: boolean }): Promise<ListMutationResponse> => {
      const response = await fetch(`/api/lists/${id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update visibility");
      }
      return response.json();
    },
    onMutate: async ({ id, slug, isPublic }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listQueryKeys.allLists() }),
        queryClient.cancelQueries({ queryKey: listQueryKeys.unified(slug) }),
      ]);
      const previousLists = queryClient.getQueryData<{ lists: UserList[] }>(listQueryKeys.allLists());
      const previousUnified = queryClient.getQueryData<UnifiedListData>(listQueryKeys.unified(slug));
      const previousBrowse = snapshotBrowsePublicCaches(queryClient);
      const previousCurrent = currentList.get();
      const fromLists = previousLists?.lists?.find((item) => item.id === id);
      const optimistic = {
        ...(fromLists || {}),
        id,
        slug,
        isPublic,
        title: fromLists?.title ?? previousUnified?.list?.title ?? slug,
        description: fromLists?.description ?? previousUnified?.list?.description ?? null,
        urls: fromLists?.urls ?? previousUnified?.list?.urls ?? [],
      } as UrlList & UserList;
      patchAllListsCache(queryClient, optimistic);
      patchUnifiedListCache(queryClient, optimistic);
      densifyBrowsePublicLists(queryClient, optimistic);
      if (previousCurrent.id === id) {
        currentList.set({ ...previousCurrent, isPublic });
      }
      return { previousLists, previousUnified, previousBrowse, previousCurrent };
    },
    onSuccess: (data) => {
      patchAllListsCache(queryClient, data.list);
      patchUnifiedListCache(queryClient, data.list);
      densifyBrowsePublicLists(queryClient, data.list);
      invalidateMutationImpact(queryClient, "visibility", data.list.slug, data.list.id);
    },
    onError: (_error, input, context) => {
      if (context?.previousLists) queryClient.setQueryData(listQueryKeys.allLists(), context.previousLists);
      if (context?.previousUnified) queryClient.setQueryData(listQueryKeys.unified(input.slug), context.previousUnified);
      if (context?.previousBrowse) restoreBrowsePublicCaches(queryClient, context.previousBrowse);
      if (context?.previousCurrent.id === input.id) currentList.set(context.previousCurrent);
    },
  });
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
export type DeleteListVariables = {
  listId: string;
  /** When true, cache removal waits until network success (dialog UX). */
  deferOptimistic?: boolean;
};

export function useDeleteList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ listId }: DeleteListVariables) => {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete list");
      }
      return response.json();
    },
    onMutate: async ({ listId, deferOptimistic }) => {
      const previous = queryClient.getQueryData<{ lists: UserList[] }>(
        listQueryKeys.allLists(),
      );
      const deletedList = previous?.lists?.find((list) => list.id === listId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listQueryKeys.allLists() }),
        ...(deletedList?.slug
          ? [queryClient.cancelQueries({ queryKey: listQueryKeys.unified(deletedList.slug) })]
          : []),
      ]);

      const listTitle = deletedList?.title || deletedList?.slug || "List";
      const listSlug = deletedList?.slug;
      const previousBrowse = snapshotBrowsePublicCaches(queryClient);
      const previousUnified = listSlug
        ? queryClient.getQueryData<UnifiedListData>(listQueryKeys.unified(listSlug))
        : undefined;

      if (!deferOptimistic) {
        queryClient.setQueryData<{ lists: UserList[] }>(
          listQueryKeys.allLists(),
          (old) => {
            if (!old?.lists) return old;
            return {
              lists: old.lists.filter((list) => list.id !== listId),
            };
          },
        );

        if (deletedList) {
          densifyBrowsePublicLists(queryClient, deletedList, { remove: true });
        }
        if (listSlug) {
          dropUnifiedListCache(queryClient, listSlug);
        }
      }

      return {
        previous,
        previousBrowse,
        previousUnified,
        deletedListTitle: listTitle,
        deletedListSlug: listSlug,
        deletedList,
        deferOptimistic: Boolean(deferOptimistic),
        listId,
      };
    },
    onSuccess: (_data, { listId }, context) => {
      if (context?.deferOptimistic && context.deletedList) {
        queryClient.setQueryData<{ lists: UserList[] }>(
          listQueryKeys.allLists(),
          (old) => {
            if (!old?.lists) return old;
            return {
              lists: old.lists.filter((list) => list.id !== listId),
            };
          },
        );
        densifyBrowsePublicLists(queryClient, context.deletedList, {
          remove: true,
        });
        if (context.deletedListSlug) {
          dropUnifiedListCache(queryClient, context.deletedListSlug);
        }
      } else if (context?.deletedListSlug) {
        densifyBrowsePublicLists(
          queryClient,
          { id: listId, slug: context.deletedListSlug },
          { remove: true },
        );
        dropUnifiedListCache(queryClient, context.deletedListSlug);
      }
      invalidateMutationImpact(
        queryClient,
        "list",
        context?.deletedListSlug || listId,
        listId,
      );

      // Use list title from context (captured before deletion)
      const listTitle = context?.deletedListTitle || "List";

      toast({
        title: "List Deleted 🗑️",
        description: `"${listTitle}" has been successfully deleted.`,
        variant: "success",
      });
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(listQueryKeys.allLists(), context.previous);
      }
      if (context?.previousBrowse) {
        restoreBrowsePublicCaches(queryClient, context.previousBrowse);
      }
      if (context?.deletedListSlug && context?.previousUnified) {
        queryClient.setQueryData(
          listQueryKeys.unified(context.deletedListSlug),
          context.previousUnified,
        );
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

        // C7.9 playbook: densify/drop on delete + visibility so thin seed cannot resurrect ghosts
        if (action === "list_deleted") {
          queryClient.setQueryData<{ lists: UserList[] }>(
            listQueryKeys.allLists(),
            (old) => {
              if (!old?.lists) return old;
              return {
                lists: old.lists.filter(
                  (list) => list.id !== listId && list.slug !== listSlug,
                ),
              };
            },
          );
          densifyBrowsePublicLists(
            queryClient,
            { id: listId!, slug: listSlug! },
            { remove: true },
          );
          dropUnifiedListCache(queryClient, listSlug!);
        } else if (
          action === "list_made_public" ||
          action === "list_made_private"
        ) {
          const isPublic = action === "list_made_public";
          queryClient.setQueryData<{ lists: UserList[] }>(
            listQueryKeys.allLists(),
            (old) => {
              if (!old?.lists) return old;
              return {
                lists: old.lists.map((list) =>
                  list.id === listId || list.slug === listSlug
                    ? { ...list, isPublic }
                    : list,
                ),
              };
            },
          );
          const fromLists = queryClient
            .getQueryData<{ lists: UserList[] }>(listQueryKeys.allLists())
            ?.lists?.find(
              (list) => list.id === listId || list.slug === listSlug,
            );
          densifyBrowsePublicLists(
            queryClient,
            {
              id: listId!,
              slug: listSlug!,
              title: fromLists?.title,
              description: fromLists?.description ?? undefined,
              urls: fromLists?.urls,
              isPublic,
            },
            isPublic ? undefined : { remove: true },
          );
        }

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
