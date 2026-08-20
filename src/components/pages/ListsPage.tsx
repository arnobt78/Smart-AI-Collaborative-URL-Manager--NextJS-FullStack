"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CreateNewListButton } from "@/components/ui/CreateNewListButton";
import { Badge } from "@/components/ui/Badge";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { LinkIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Globe, Lock, Calendar, Clock, Eye, Users } from "lucide-react";
import {
  useAllListsQuery,
  useDeleteList,
  setupSSECacheSync,
  type UserList,
} from "@/hooks/useListQueries";
import { cn } from "@/lib/utils";
import {
  HEADING_STACK,
  LIST_STACK,
  PAGE_HEADER,
  PAGE_STACK,
} from "@/lib/ui-spacing";
import EditListPageClient from "@/components/pages/EditListPage";
import { DataSurfaceSlot } from "@/components/ui/DataSurfaceSlot";
import { Dialog } from "@/components/ui/Dialog";
import { useListDialogRouteState } from "@/hooks/useListDialogRouteState";
import { CreateListDialog } from "@/components/lists/CreateListDialog";

// Keep type alias for backward compatibility
type List = UserList;

export default function ListsPageClient() {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [editPending, setEditPending] = useState(false);
  const {
    createDialogOpen,
    editDialogSlug,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  } = useListDialogRouteState();

  // Setup SSE cache sync for React Query
  useEffect(() => {
    return setupSSECacheSync();
  }, []);

  // Use React Query for fetching lists with automatic refetching
  const { data: listsData, isLoading } = useAllListsQuery();
  const lists = listsData?.lists || [];
  const isColdLoading = !listsData && isLoading;

  // Use React Query mutation for deleting lists
  const deleteListMutation = useDeleteList();

  const handleDeleteClick = (list: List) => {
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;

    const id = listToDelete.id;
    // Use React Query mutation (handles optimistic updates, rollback, and toasts automatically)
    // OPTIMIZATION: No need to call refetch() - mutation's onSuccess already invalidates and triggers refetch
    deleteListMutation.mutate(id, {
      onSuccess: () => {
        // Close after the optimistic card removal has had a chance to paint.
        requestAnimationFrame(() => {
          setDeleteDialogOpen(false);
          setListToDelete(null);
        });
        // No need to refetch - mutation's invalidateAllListsQueries already triggers refetch
      },
      onError: () => {
        // Error toast is handled by mutation
        // Keep dialog open on error so user can retry
      },
    });
  };

  const handleEditClick = (list: List) => {
    openEditDialog(list.slug);
  };

  const editList = editDialogSlug ? lists.find((list) => list.slug === editDialogSlug) : undefined;

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
    date: string | Date | null | undefined,
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
    <div className={cn("min-h-screen w-full", PAGE_STACK)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className={PAGE_HEADER}>
          <h1 className="text-lg sm:text-xl  font-medium bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent leading-tight">
            My Lists
          </h1>
          <p className="text-sm sm:text-base text-white/70 leading-snug">
            Manage and organize your URL collections
          </p>
        </div>
        <CreateNewListButton onClick={openCreateDialog} />
      </div>

      <div className={LIST_STACK}>
        {isColdLoading ? (
          <DataSurfaceSlot label="Preparing your lists" description="Loading your latest collections…" />
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
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md p-2 sm:p-4 shadow-md hover:shadow-xl transition-all duration-300 hover:border-blue-400/40 hover:from-white/10 hover:to-white/5"
              >
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-300 rounded-xl pointer-events-none" />

                <div className="relative z-10">
                  {/* Header Row */}
                  <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title with badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/list/${list.slug}`)}
                          className="max-w-full min-w-0 truncate text-left text-sm font-medium text-white transition-colors hover:underline underline-offset-2 group-hover:text-blue-300 sm:text-base"
                        >
                          {list.title || `List: ${list.slug}`}
                        </button>
                        {/* Visibility Badge */}
                        {list.isPublic !== undefined && (
                          <Badge
                            variant={list.isPublic ? "success" : "secondary"}
                            className="shrink-0 gap-1 px-2 py-0.5 text-xs leading-5"
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
                        <p className="text-sm text-white/70 line-clamp-2 ">
                          {description}
                        </p>
                      )}

                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        {/* URL Count */}
                        <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 leading-5 text-white/80">
                          <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                          <span className="font-medium">{urlCount}</span>
                          <span className="text-white/60 hidden sm:inline">
                            {urlCount === 1 ? "URL" : "URLs"}
                          </span>
                        </span>

                        {/* Collaborators Count */}
                        {collaboratorCount > 0 && (
                          <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 leading-5 text-white/80">
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
                          <span className="flex items-center gap-1 text-white/60">
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
                              <span className="flex items-center gap-1 text-white/60">
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
                    <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                      <Button onClick={() => router.push(`/list/${list.slug}`)} variant="ghost" className="p-2 text-white/80 transition-colors hover:border-blue-400/30 hover:bg-blue-500/20 hover:text-blue-400" title="View List" aria-label={`View ${list.title || list.slug}`}>
                        <Eye className="size-4" aria-hidden />
                      </Button>
                      <Button
                        onClick={() => handleEditClick(list)}
                        variant="ghost"
                        className="border border-transparent p-2 text-white/80 transition-colors hover:border-blue-400/30 hover:bg-blue-500/20 hover:text-blue-400"
                        title="Edit List"
                      >
                        <PencilIcon className="h-4 w-4 " />
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(list)}
                        variant="ghost"
                        className="border border-transparent p-2 text-white/80 transition-colors hover:border-red-400/30 hover:bg-red-500/20 hover:text-red-400"
                        disabled={
                          deleteListMutation.isPending &&
                          listToDelete?.id === list.id
                        }
                        title="Delete List"
                      >
                        <TrashIcon className="h-4 w-4 " />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border-2 border-dashed border-white/30 p-2 sm:p-4 text-center bg-white/5 backdrop-blur-md">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full flex items-center justify-center">
              <LinkIcon className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-blue-400" />
            </div>
            <div className={`${HEADING_STACK} mt-4`}>
              <h3 className="text-base sm:text-lg font-medium text-white">
                No Lists Yet
              </h3>
              <p className="text-sm sm:text-base text-white/60 px-2">
                Start organizing your URLs by creating your first list
              </p>
            </div>
            <div className="mt-6 sm:mt-8">
              <CreateNewListButton onClick={openCreateDialog} />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteListMutation.isPending) setDeleteDialogOpen(open);
        }}
        title="Delete List"
        description={
          listToDelete
            ? `Are you sure you want to delete "${
                listToDelete.title || listToDelete.slug
              }"? This action cannot be undone.`
            : "Are you sure you want to delete this list? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        pending={deleteListMutation.isPending}
        pendingText="Deleting…"
        closeOnConfirm={false}
      />
      <CreateListDialog
        open={createDialogOpen}
        onOpenChange={(open) => !open && closeDialog()}
      />
      {editList ? (
        <Dialog
          open
          onOpenChange={(open) => !open && closeDialog()}
          title="Edit List"
          description="Update your list details and settings."
          size="wide"
          headerMode="scroll"
          pending={editPending}
        >
          <EditListPageClient
            key={editList.id}
            list={editList}
            onClose={closeDialog}
            onPendingChange={setEditPending}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
