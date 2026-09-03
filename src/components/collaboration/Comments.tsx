"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { Button } from "@/components/ui/Button";
import { CancelButton } from "@/components/ui/ActionButtons";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toaster";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Trash2, Edit2, Check, MessageSquarePlus } from "lucide-react";
import { invalidateMutationImpact } from "@/utils/queryInvalidation";
import { listQueryKeys } from "@/lib/query-keys";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
}

interface CommentsProps {
  listId: string;
  urlId: string;
  currentUserId?: string;
  /** Unified comment count — skip fetch and paint empty when 0. */
  knownCount?: number;
}

export function Comments({ listId, urlId, currentUserId, knownCount }: CommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showColdLoading, setShowColdLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : null;
  const list = useStore(currentList);
  const skipFetch = knownCount === 0;

  const updateVisibleCommentCount = (delta: number) => {
    const current = currentList.get();
    if (current.id !== listId || !current.urls) return;
    currentList.set({
      ...current,
      urls: current.urls.map((url) =>
        url.id === urlId
          ? { ...url, commentCount: Math.max(0, (url.commentCount || 0) + delta) }
          : url,
      ),
    });

    // Patch unified RQ cache so soft-nav detail paints the correct badge
    const currentSlug = slug || current.slug;
    if (currentSlug) {
      type UnifiedCache = {
        list?: { urls?: Array<{ id: string; commentCount?: number }> };
        commentCounts?: Record<string, number>;
      };
      queryClient.setQueryData<UnifiedCache>(
        listQueryKeys.unified(currentSlug),
        (cached) => {
          if (!cached) return cached;
          const prev = cached.commentCounts?.[urlId] ?? 0;
          return {
            ...cached,
            commentCounts: { ...cached.commentCounts, [urlId]: Math.max(0, prev + delta) },
            list: cached.list
              ? {
                  ...cached.list,
                  urls: cached.list.urls?.map((u) =>
                    u.id === urlId
                      ? { ...u, commentCount: Math.max(0, (u.commentCount || 0) + delta) }
                      : u,
                  ),
                }
              : cached.list,
          };
        },
      );
    }
  };

  // React Query key for comments
  const queryKey = useMemo(() => ["comments", listId, urlId], [listId, urlId]);

  // Fetch comments using React Query
  const { data: commentsData, isLoading } = useQuery<{
    comments: Comment[];
    cached?: boolean;
  }>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(
        `/api/lists/${listId}/comments?urlId=${urlId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }
      return response.json();
    },
    enabled: !skipFetch,
    initialData: skipFetch ? { comments: [] } : undefined,
    // CRITICAL: Cache forever until invalidated (after comment add/update/delete)
    // With staleTime: Infinity, data never becomes stale automatically
    // Only becomes stale when manually invalidated, then refetches once
    staleTime: Infinity, // Cache forever until invalidated
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache after component unmounts (matches standard)
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    // CRITICAL: Refetch only when stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    // Normal usage uses cache instantly (no API calls)
    refetchOnMount: true, // Refetch only when stale (after invalidation)
    retry: 1,
    // CRITICAL: Use stale data immediately if available, fetch fresh in background
    placeholderData: (previousData) => previousData, // Keep previous data visible while refetching
  });

  const comments = commentsData?.comments || [];

  // Cached comments stay visible; an uncached dialog only shows feedback when
  // the request is genuinely slow, preventing an opening-state spinner flash.
  useEffect(() => {
    if (skipFetch || !isLoading || commentsData) {
      setShowColdLoading(false);
      return;
    }
    const timeout = setTimeout(() => setShowColdLoading(true), 200);
    return () => clearTimeout(timeout);
  }, [commentsData, isLoading, skipFetch]);

  // Listen for real-time comment updates (from other clients)
  useEffect(() => {
    const handleCommentUpdate = () => {
      // Invalidate and refetch comments
      queryClient.invalidateQueries({ queryKey });
    };

    window.addEventListener("comment-updated", handleCommentUpdate);
    return () => {
      window.removeEventListener("comment-updated", handleCommentUpdate);
    };
  }, [listId, urlId, queryClient, queryKey]);

  // Create comment mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/lists/${listId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlId, content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add comment");
      }

      return response.json();
    },
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<{ comments: Comment[] }>(
        queryKey,
      );

      // Optimistically update cache with temporary comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: currentUserId || "",
          email: "You",
        },
      };

      queryClient.setQueryData<{ comments: Comment[] }>(queryKey, (old) => ({
        comments: [...(old?.comments || []), optimisticComment],
      }));
      updateVisibleCommentCount(1);

      return { previousData, commentCountDelta: 1 };
    },
    onSuccess: async (data) => {
      // Update cache with server response
      queryClient.setQueryData<{ comments: Comment[] }>(queryKey, (old) => {
        if (!old) return { comments: [data.comment] };
        // Replace optimistic comment with real one
        const filtered = old.comments.filter((c) => !c.id.startsWith("temp-"));
        return { comments: [...filtered, data.comment] };
      });

      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
        variant: "success",
      });

      // CRITICAL: Dispatch activity-added event for immediate optimistic activity feed update
      // This provides instant feedback before unified query refetch completes
      if (data.activity) {
        window.dispatchEvent(
          new CustomEvent("activity-added", {
            detail: {
              listId,
              activity: data.activity,
            },
          }),
        );
      }

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // This ensures activity feed gets complete updated list (matches edit/delete behavior)
      // Same pattern as URL add/edit/delete mutations for consistency
      const currentSlug = slug || list?.slug;
      if (currentSlug) invalidateMutationImpact(queryClient, "comment", currentSlug, listId);
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      if (context?.commentCountDelta) updateVisibleCommentCount(-context.commentCountDelta);
      toast({
        title: "Failed to add comment",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "error",
      });
    },
  });

  // Submit new comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || createMutation.isPending) return;
    createMutation.mutate(newComment.trim());
  };

  // Start editing
  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  // Update comment mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const response = await fetch(`/api/lists/${listId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update comment");
      }

      return response.json();
    },
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<{ comments: Comment[] }>(
        queryKey,
      );

      // Optimistically update comment
      queryClient.setQueryData<{ comments: Comment[] }>(queryKey, (old) => {
        if (!old) return old;
        return {
          comments: old.comments.map((c) =>
            c.id === commentId
              ? { ...c, content, updatedAt: new Date().toISOString() }
              : c,
          ),
        };
      });
      // Editing changes content only; it must not affect the action badge.
      return { previousData };
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData<{ comments: Comment[] }>(queryKey, (old) => {
        if (!old) return { comments: [data.comment] };
        return {
          comments: old.comments.map((c) =>
            c.id === data.comment.id ? data.comment : c,
          ),
        };
      });

      setEditingId(null);
      setEditContent("");
      toast({
        title: "Comment updated",
        description: "Changes saved successfully",
        variant: "success",
      });

      // CRITICAL: Dispatch activity-added event for immediate activity feed update
      if (data.activity) {
        window.dispatchEvent(
          new CustomEvent("activity-added", {
            detail: {
              listId,
              activity: data.activity,
            },
          }),
        );
      }

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // This ensures activity feed gets complete updated list
      const currentSlug = slug || list?.slug;
      if (currentSlug) invalidateMutationImpact(queryClient, "comment", currentSlug, listId);
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      toast({
        title: "Failed to update comment",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "error",
      });
    },
  });

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim() || updateMutation.isPending) return;
    updateMutation.mutate({
      commentId: editingId,
      content: editContent.trim(),
    });
  };

  // Delete comment mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(
        `/api/lists/${listId}/comments?commentId=${commentId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete comment");
      }

      return response.json();
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<{ comments: Comment[] }>(
        queryKey,
      );

      // Optimistically remove comment
      queryClient.setQueryData<{ comments: Comment[] }>(queryKey, (old) => {
        if (!old) return old;
        return {
          comments: old.comments.filter((c) => c.id !== commentId),
        };
      });
      updateVisibleCommentCount(-1);

      return { previousData, commentCountDelta: -1 };
    },
    onSuccess: (data) => {
      toast({
        title: "Comment deleted",
        description: "The comment has been removed",
        variant: "success",
      });

      // CRITICAL: Dispatch activity-added event for immediate activity feed update
      if (data?.activity) {
        window.dispatchEvent(
          new CustomEvent("activity-added", {
            detail: {
              listId,
              activity: data.activity,
            },
          }),
        );
      }

      // CRITICAL: Invalidate unified query to trigger updates?activityLimit=30 refetch
      // This ensures activity feed gets complete updated list
      const currentSlug = slug || list?.slug;
      if (currentSlug) invalidateMutationImpact(queryClient, "comment", currentSlug, listId);

      // Note: We don't dispatch "comment-updated" here because:
      // 1. We've already updated the cache optimistically
      // 2. The real-time system (SSE) will notify other clients automatically
      // 3. Dispatching here would trigger our own listener and cause a redundant refetch
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      if (context?.commentCountDelta) updateVisibleCommentCount(-context.commentCountDelta);

      toast({
        title: "Failed to delete comment",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "error",
      });
    },
  });

  // Open delete confirmation dialog
  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete and keep the overlay pending until the mutation settles.
  const handleDeleteConfirm = () => {
    if (!commentToDelete) return;
    deleteMutation.mutate(commentToDelete, {
      onSuccess: () => {
        requestAnimationFrame(() => {
          setDeleteDialogOpen(false);
          setCommentToDelete(null);
        });
      },
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Add Comment Form */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[70px] sm:min-h-[80px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/50 text-sm"
            disabled={createMutation.isPending}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newComment.trim() || createMutation.isPending}
              isLoading={createMutation.isPending}
              loadingText="Posting…"
              className="px-2 sm:px-3 py-1 text-xs"
            >
              <MessageSquarePlus className={UI_ICON_CONTROL} aria-hidden />
              Post Comment
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-2 sm:space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {showColdLoading ? (
          <div className="text-xs sm:text-sm text-white/50 text-center py-3 sm:py-4">
            Loading comments...
          </div>
        ) : isLoading && !commentsData ? null : comments.length === 0 ? (
          <div className="text-xs sm:text-sm text-white/50 text-center py-3 sm:py-4">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => {
            const isOwner = currentUserId === comment.user.id;
            const isEditing = editingId === comment.id;

            return (
              <div
                key={comment.id}
                className="bg-white/5 rounded-lg p-2.5 sm:p-3 border border-white/10"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[70px] sm:min-h-[80px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/50 text-sm"
                    />
                    <div className="flex justify-end ">
                      <CancelButton
                        onClick={handleCancelEdit}
                        className="px-2 sm:px-3 text-xs"
                      >
                        Cancel
                      </CancelButton>
                      <Button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={updateMutation.isPending}
                        isLoading={updateMutation.isPending}
                        loadingText="Saving…"
                        className="px-2 sm:px-3 py-1 text-xs"
                      >
                        <Check className={UI_ICON_CONTROL} aria-hidden />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1.5 sm:">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/90 truncate">
                          {comment.user.email}
                        </div>
                        <div className="text-xs text-white/50">
                          {formatDate(comment.createdAt)}
                          {comment.updatedAt !== comment.createdAt &&
                            " (edited)"}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(comment)}
                            className="p-1 sm:p-1.5 rounded hover:bg-white/10 transition-colors"
                            title="Edit comment"
                          >
                            <Edit2 className={cn(UI_ICON_CONTROL, "text-white/70")} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(comment.id)}
                            className="p-1 sm:p-1.5 rounded hover:bg-white/10 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className={cn(UI_ICON_CONTROL, "text-red-400/70")} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-white/80 whitespace-pre-wrap break-words">
                      {comment.content}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteMutation.isPending) setDeleteDialogOpen(open);
        }}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        pending={deleteMutation.isPending}
        pendingText="Deleting…"
        closeOnConfirm={false}
      />
    </div>
  );
}
