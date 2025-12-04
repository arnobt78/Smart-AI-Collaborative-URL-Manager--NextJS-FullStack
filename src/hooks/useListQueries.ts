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
} from "@/utils/queryInvalidation";

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
          window.dispatchEvent(
            new CustomEvent("unified-update-unauthorized", {
              detail: { listId: slug, slug },
            })
          );
          return { list: null, activities: [], collaborators: [] };
        }
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();

      // Update store immediately
      if (data.list) {
        currentList.set(data.list);
      }

      // Populate React Query cache for collaborators
      if (data.list?.id && data.collaborators) {
        queryClient.setQueryData(listQueryKeys.collaborators(data.list.id), {
          collaborators: data.collaborators,
        });
      }

      // Dispatch events for components
      if (data.list?.id) {
        window.dispatchEvent(
          new CustomEvent("unified-activities-updated", {
            detail: {
              listId: data.list.id,
              activities: data.activities || [],
            },
          })
        );

        window.dispatchEvent(
          new CustomEvent("unified-collaborators-updated", {
            detail: {
              listId: data.list.id,
              collaborators: data.collaborators || [],
            },
          })
        );
      }

      return {
        list: data.list || null,
        activities: data.activities || [],
        collaborators: data.collaborators || [],
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
    // CRITICAL: Use stale data immediately if available, fetch fresh in background
    placeholderData: (previousData) => previousData, // Keep previous data visible while refetching
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

      queryClient.setQueryData(queryKey, (old: any) => {
        const existing = old?.collaborators || [];
        const trimmedEmail = email.trim().toLowerCase();
        const exists = existing.some(
          (c: any) => c.email.toLowerCase() === trimmedEmail
        );

        if (exists) {
          return {
            collaborators: existing.map((c: any) =>
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
        invalidateCollaboratorQueries(queryClient, listSlug);
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

      queryClient.setQueryData(queryKey, (old: any) => {
        const existing = old?.collaborators || [];
        const emailLower = email.toLowerCase();
        return {
          collaborators: existing.map((c: any) =>
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
        invalidateCollaboratorQueries(queryClient, listSlug);
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

      queryClient.setQueryData(queryKey, (old: any) => {
        const existing = old?.collaborators || [];
        const emailLower = email.toLowerCase();
        return {
          collaborators: existing.filter(
            (c: any) => c.email.toLowerCase() !== emailLower
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
        invalidateCollaboratorQueries(queryClient, listSlug);
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

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query, all lists, collections, and duplicates
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
    onSuccess: (data, urlId) => {
      // Update store with server response
      if (data.list) {
        currentList.set(data.list);
      }

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query, all lists, collections, and duplicates
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

      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates unified query, all lists, collections, and duplicates
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

      // Get list title before removing from cache
      const deletedList = previous?.lists?.find((l) => l.id === listId);
      const listTitle = deletedList?.title || deletedList?.slug || "List";

      queryClient.setQueryData(listQueryKeys.allLists(), (old: any) => {
        if (!old?.lists) return old;
        return {
          lists: old.lists.filter((list: UserList) => list.id !== listId),
        };
      });

      return { previous, deletedListTitle: listTitle };
    },
    onSuccess: (data, listId, context) => {
      // CRITICAL: Use centralized invalidation for consistency
      // Invalidates all list-related queries
      invalidateAllListsQueries(queryClient);

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
export function setupSSECacheSync() {
  // Sync React Query cache when SSE events fire
  const handleUnifiedUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<{
      listId?: string;
      action?: string;
      slug?: string;
    }>;

    const listId = customEvent.detail?.listId;
    const slug = customEvent.detail?.slug;
    const action = customEvent.detail?.action || "";

    if (!listId) return;

    // REMOVED: Aggressive invalidations causing duplicate API calls
    // React Query's staleTime handles cache freshness
    // SSE events already trigger unified-update which ListPage handles
    // Only mutations need explicit invalidations (handled in mutation callbacks)
  };

  if (typeof window !== "undefined") {
    window.addEventListener("unified-update", handleUnifiedUpdate);

    return () => {
      window.removeEventListener("unified-update", handleUnifiedUpdate);
    };
  }
}
