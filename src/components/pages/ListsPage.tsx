"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useToast } from "@/components/ui/Toaster";
import { LinkIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  Globe,
  Lock,
  Calendar,
  Clock,
  Users,
  ExternalLink,
} from "lucide-react";
import {
  useAllListsQuery,
  useDeleteList,
  setupSSECacheSync,
  type UserList,
} from "@/hooks/useListQueries";

// Keep interface for backward compatibility
interface List extends UserList {}

export default function ListsPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);

  // Setup SSE cache sync for React Query
  useEffect(() => {
    return setupSSECacheSync();
  }, []);

  // Use React Query for fetching lists with automatic refetching
  const { data: listsData, isLoading, refetch } = useAllListsQuery();
  const lists = listsData?.lists || [];

  // Use React Query mutation for deleting lists
  const deleteListMutation = useDeleteList();

  // Hardcoded skeleton count - always show 3 skeletons while loading
  const skeletonCount = 3;

  const handleDeleteClick = (list: List) => {
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;

    const id = listToDelete.id;
    const listTitle = listToDelete.title || listToDelete.slug;

    // Use React Query mutation (handles optimistic updates, rollback, and toasts automatically)
    // OPTIMIZATION: No need to call refetch() - mutation's onSuccess already invalidates and triggers refetch
    deleteListMutation.mutate(id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setListToDelete(null);
        // No need to refetch - mutation's invalidateAllListsQueries already triggers refetch
      },
      onError: () => {
        // Error toast is handled by mutation
        // Keep dialog open on error so user can retry
      },
    });
  };

  const handleEditClick = (list: List) => {
    router.push(`/list/${list.slug}/edit`);

    // Show info toast notification
    toast({
      title: "Opening Editor ✏️",
      description: `Editing "${list.title || list.slug}"...`,
      variant: "info",
    });
  };

  // Helper function to format date safely
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "Unknown";
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "Invalid Date";
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // Helper function to format relative time
  const formatRelativeTime = (
    date: string | Date | null | undefined
  ): string => {
    if (!date) return "Unknown";
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "Unknown";
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return formatDate(dateObj);
    } catch {
      return "Unknown";
    }
  };

  // Helper to get date from either camelCase or snake_case
  const getDate = (list: List, field: "created" | "updated"): Date | null => {
    const camelKey = field === "created" ? "createdAt" : "updatedAt";
    const snakeKey = field === "created" ? "created_at" : "updated_at";
    const value = list[camelKey as keyof List] || list[snakeKey as keyof List];
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  return (
    <div className="min-h-screen w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
            My Lists
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-white/70">
            Manage and organize your URL collections
          </p>
        </div>
        {!isLoading && (
          <Button
            href="/new"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5"
          >
            Create New List
          </Button>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          // Skeleton loaders matching the exact card structure
          <>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-sm p-4 sm:p-6 shadow-md animate-pulse"
              >
                {/* Subtle glow effect skeleton */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-indigo-500/0 rounded-xl pointer-events-none" />

                <div className="relative z-10">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      {/* Title with badges skeleton */}
                      <div className="flex items-start gap-2 sm:gap-3 flex-wrap mb-2">
                        {/* Title skeleton */}
                        <div className="h-6 sm:h-7 md:h-8 bg-white/10 rounded w-48 sm:w-64" />
                        {/* Visibility Badge skeleton */}
                        <div className="h-5 bg-white/10 rounded-full w-16 sm:w-20" />
                      </div>

                      {/* Description Preview skeleton */}
                      <div className="h-4 bg-white/10 rounded w-full mb-1" />
                      <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />

                      {/* Stats Row skeleton */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        {/* URL Count badge skeleton */}
                        <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 bg-white/10 rounded" />
                          <div className="h-4 bg-white/10 rounded w-6" />
                          <div className="h-4 bg-white/10 rounded w-12 hidden sm:block" />
                        </div>

                        {/* Collaborators badge skeleton */}
                        <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 bg-white/10 rounded" />
                          <div className="h-4 bg-white/10 rounded w-4" />
                          <div className="h-4 bg-white/10 rounded w-16 hidden sm:block" />
                        </div>

                        {/* Created Date skeleton */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 bg-white/10 rounded" />
                          <div className="h-4 bg-white/10 rounded w-12 hidden sm:block" />
                          <div className="h-4 bg-white/10 rounded w-20" />
                        </div>

                        {/* Updated Date skeleton */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 bg-white/10 rounded" />
                          <div className="h-4 bg-white/10 rounded w-12 hidden sm:block" />
                          <div className="h-4 bg-white/10 rounded w-16" />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons skeleton */}
                    <div className="flex flex-row gap-2 w-full sm:w-auto shrink-0">
                      {/* Edit Button skeleton */}
                      <div className="h-10 w-10 bg-white/10 rounded-lg border border-transparent" />
                      {/* Delete Button skeleton */}
                      <div className="h-10 w-10 bg-white/10 rounded-lg border border-transparent" />
                      {/* View List Button skeleton */}
                      <div className="h-10 bg-white/10 rounded-lg w-24 sm:w-32" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : lists.length > 0 ? (
          lists.map((list) => {
            const createdDate = getDate(list, "created");
            const updatedDate = getDate(list, "updated");
            const urlCount = list.urls?.length || 0;
            const collaboratorCount = list.collaborators?.length || 0;
            const description = list.description || "";

            return (
              <div
                key={list.id}
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-sm p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:border-blue-400/40 hover:from-white/10 hover:to-white/5"
              >
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-300 rounded-xl pointer-events-none" />

                <div className="relative z-10">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      {/* Title with badges */}
                      <div className="flex items-start gap-2 sm:gap-3 flex-wrap mb-2">
                        <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                          {list.title || `List: ${list.slug}`}
                        </h2>
                        {/* Visibility Badge */}
                        {list.isPublic !== undefined && (
                          <Badge
                            variant={list.isPublic ? "success" : "secondary"}
                            className="text-xs sm:text-sm flex items-center gap-1 shrink-0"
                          >
                            {list.isPublic ? (
                              <>
                                <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline">Public</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline">
                                  Private
                                </span>
                              </>
                            )}
                          </Badge>
                        )}
                      </div>

                      {/* Description Preview */}
                      {description && (
                        <p className="text-sm text-white/70 line-clamp-2 mb-3">
                          {description}
                        </p>
                      )}

                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                        {/* URL Count */}
                        <span className="flex items-center gap-1.5 text-white/80 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                          <span className="font-medium">{urlCount}</span>
                          <span className="text-white/60 hidden sm:inline">
                            {urlCount === 1 ? "URL" : "URLs"}
                          </span>
                        </span>

                        {/* Collaborators Count */}
                        {collaboratorCount > 0 && (
                          <span className="flex items-center gap-1.5 text-white/80 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                            <span className="font-medium">
                              {collaboratorCount}
                            </span>
                            <span className="text-white/60 hidden sm:inline">
                              {collaboratorCount === 1
                                ? "Collaborator"
                                : "Collaborators"}
                            </span>
                          </span>
                        )}

                        {/* Created Date */}
                        {createdDate && (
                          <span className="flex items-center gap-1.5 text-white/60">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                            <span className="hidden sm:inline">Created</span>
                            <span className="font-medium">
                              {formatDate(createdDate)}
                            </span>
                          </span>
                        )}

                        {/* Updated Date */}
                        {updatedDate && createdDate && (
                          <>
                            {new Date(updatedDate).getTime() !==
                              new Date(createdDate).getTime() && (
                              <span className="flex items-center gap-1.5 text-white/60">
                                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                                <span className="hidden sm:inline">
                                  Updated
                                </span>
                                <span className="font-medium">
                                  {formatRelativeTime(updatedDate)}
                                </span>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row gap-2 w-full sm:w-auto shrink-0">
                      <Button
                        onClick={() => handleEditClick(list)}
                        variant="ghost"
                        className="text-white/80 hover:text-blue-400 hover:bg-blue-500/20 transition-all duration-200 border border-transparent hover:border-blue-400/30 p-2 sm:p-2.5"
                        title="Edit List"
                      >
                        <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(list)}
                        variant="ghost"
                        className="text-white/80 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200 border border-transparent hover:border-red-400/30 p-2 sm:p-2.5"
                        disabled={
                          deleteListMutation.isPending &&
                          listToDelete?.id === list.id
                        }
                        title="Delete List"
                      >
                        <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button
                        onClick={() => router.push(`/list/${list.slug}`)}
                        className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto flex items-center gap-1.5 sm:gap-2 group/btn px-3 sm:px-4 py-2 sm:py-2.5"
                      >
                        <span>View List</span>
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border-2 border-dashed border-white/30 p-4 sm:p-6 lg:p-8 text-center bg-white/5 backdrop-blur-sm">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full flex items-center justify-center">
              <LinkIcon className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-blue-400" />
            </div>
            <h3 className="mt-4 text-base sm:text-lg font-medium text-white">
              No Lists Yet
            </h3>
            <p className="mt-2 text-sm sm:text-base text-white/60 px-2">
              Start organizing your URLs by creating your first list
            </p>
            <div className="mt-6 sm:mt-8">
              <Button
                href="/new"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5"
              >
                Create New List
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete List"
        description={
          listToDelete
            ? `Are you sure you want to delete "${
                listToDelete.title || listToDelete.slug
              }"? This action cannot be undone.`
            : "Are you sure you want to delete this list? This action cannot be undone."
        }
        confirmText={deleteListMutation.isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
}
