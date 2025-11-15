"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toaster";
import { MessageSquare, Trash2, Edit2, X, Check } from "lucide-react";

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
}

export function Comments({ listId, urlId, currentUserId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { toast } = useToast();

  // Fetch comments
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/lists/${listId}/comments?urlId=${urlId}`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [listId, urlId]);

  // Listen for real-time comment updates
  useEffect(() => {
    const handleCommentUpdate = () => {
      fetchComments();
    };

    window.addEventListener("comment-updated", handleCommentUpdate);
    return () => {
      window.removeEventListener("comment-updated", handleCommentUpdate);
    };
  }, [listId, urlId]);

  // Submit new comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/lists/${listId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlId, content: newComment }),
      });

      if (response.ok) {
        setNewComment("");
        await fetchComments();
        toast({
          title: "Comment added",
          description: "Your comment has been posted",
          variant: "success",
        });
        // Trigger real-time updates
        window.dispatchEvent(new CustomEvent("comment-updated"));
        window.dispatchEvent(
          new CustomEvent("activity-updated", {
            detail: { listId },
          })
        );
      } else {
        const data = await response.json();
        toast({
          title: "Failed to add comment",
          description: data.error || "Please try again",
          variant: "error",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;

    try {
      const response = await fetch(`/api/lists/${listId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: editingId, content: editContent }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditContent("");
        await fetchComments();
        toast({
          title: "Comment updated",
          variant: "success",
        });
        window.dispatchEvent(new CustomEvent("comment-updated"));
        window.dispatchEvent(
          new CustomEvent("activity-updated", {
            detail: { listId },
          })
        );
      } else {
        const data = await response.json();
        toast({
          title: "Failed to update comment",
          description: data.error || "Please try again",
          variant: "error",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "error",
      });
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(
        `/api/lists/${listId}/comments?commentId=${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await fetchComments();
        toast({
          title: "Comment deleted",
          variant: "success",
        });
        window.dispatchEvent(new CustomEvent("comment-updated"));
        window.dispatchEvent(
          new CustomEvent("activity-updated", {
            detail: { listId },
          })
        );
      } else {
        const data = await response.json();
        toast({
          title: "Failed to delete comment",
          description: data.error || "Please try again",
          variant: "error",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "error",
      });
    }
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
    <div className="space-y-4">
      {/* Comments Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-white/70" />
        <h3 className="text-sm font-medium text-white/90">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Add Comment Form */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[80px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/50"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="px-4 py-1.5 text-xs"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="text-sm text-white/50 text-center py-4">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-white/50 text-center py-4">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => {
            const isOwner = currentUserId === comment.user.id;
            const isEditing = editingId === comment.id;

            return (
              <div
                key={comment.id}
                className="bg-white/5 rounded-lg p-3 border border-white/10"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/50"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        onClick={handleCancelEdit}
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-3 py-1 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/90 truncate">
                          {comment.user.email}
                        </div>
                        <div className="text-xs text-white/50">
                          {formatDate(comment.createdAt)}
                          {comment.updatedAt !== comment.createdAt && " (edited)"}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(comment)}
                            className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            title="Edit comment"
                          >
                            <Edit2 className="w-3 h-3 text-white/70" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(comment.id)}
                            className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3 text-red-400/70" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-white/80 whitespace-pre-wrap break-words">
                      {comment.content}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

