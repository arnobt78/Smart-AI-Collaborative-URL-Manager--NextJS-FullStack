"use client";

import React, { useEffect, useState } from "react";
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

interface List {
  id: string;
  slug: string;
  title: string | null;
  description?: string | null;
  urls: { id: string; url: string; title?: string }[];
  created_at?: string;
  createdAt?: string | Date;
  updated_at?: string;
  updatedAt?: string | Date;
  isPublic?: boolean;
  collaborators?: string[];
}

export default function ListsPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const hasFetchedRef = React.useRef(false);
  // Hardcoded skeleton count - always show 3 skeletons while loading
  const skeletonCount = 3;

  useEffect(() => {
    // Prevent double fetching (React Strict Mode in dev)
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    async function fetchData() {
      try {
        // Fetch lists
        const listsRes = await fetch("/api/lists");
        const listsData = await listsRes.json();
        const fetchedLists = listsData.lists || [];
        setLists(fetchedLists);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDeleteClick = (list: List) => {
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;

    const id = listToDelete.id;
    const listTitle = listToDelete.title || listToDelete.slug;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/lists/${id}`, { method: "DELETE" });

      if (!response.ok) throw new Error("Failed to delete list");

      const updatedLists = lists.filter((list) => list.id !== id);
      setLists(updatedLists);

      // Show success toast notification
      toast({
        title: "List Deleted 🗑️",
        description: `"${listTitle}" has been successfully deleted.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error deleting list:", error);

      // Show error toast notification
      toast({
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete list",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setListToDelete(null);
    }
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
    <main className="container mx-auto px-2 sm:px-0">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 md:gap-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              My Lists
            </h1>
            <p className="mt-2 text-white/70">
              Manage and organize your URL collections
            </p>
          </div>
          {!isLoading && (
            <Button
              href="/new"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full md:w-auto"
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
                  className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 sm:p-6 shadow-md animate-pulse"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Title section skeleton */}
                    <div className="flex-1 w-full">
                      {/* Title skeleton */}
                      <div className="h-7 bg-white/10 rounded-lg w-2/3 mb-3"></div>
                      {/* Metadata skeleton */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="h-5 bg-white/10 rounded w-20"></div>
                        <div className="h-5 bg-white/10 rounded w-24"></div>
                      </div>
                    </div>
                    {/* Buttons section skeleton */}
                    <div className="flex flex-row gap-2 w-full sm:w-auto">
                      <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                      <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                      <div className="h-10 bg-white/10 rounded-lg w-24 sm:w-32"></div>
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
                          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                            {list.title || `List: ${list.slug}`}
                          </h2>
                          {/* Visibility Badge */}
                          {list.isPublic !== undefined && (
                            <Badge
                              variant={list.isPublic ? "success" : "secondary"}
                              className="text-xs flex items-center gap-1 shrink-0"
                            >
                              {list.isPublic ? (
                                <>
                                  <Globe className="w-3 h-3" />
                                  <span className="hidden sm:inline">
                                    Public
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
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
                          className="text-white/80 hover:text-blue-400 hover:bg-blue-500/20 transition-all duration-200 border border-transparent hover:border-blue-400/30"
                          title="Edit List"
                        >
                          <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(list)}
                          variant="ghost"
                          className="text-white/80 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200 border border-transparent hover:border-red-400/30"
                          disabled={deletingId === list.id}
                          title="Delete List"
                        >
                          <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button
                          onClick={() => router.push(`/list/${list.slug}`)}
                          className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto flex items-center gap-2 group/btn"
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
            <div className="rounded-xl border-2 border-dashed border-white/30 p-8 sm:p-12 text-center bg-white/5 backdrop-blur-sm">
              <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full flex items-center justify-center">
                <LinkIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400" />
              </div>
              <h3 className="mt-4 text-base sm:text-lg font-medium text-white">
                No Lists Yet
              </h3>
              <p className="mt-2 text-white/60">
                Start organizing your URLs by creating your first list
              </p>
              <div className="mt-8">
                <Button
                  href="/new"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                >
                  Create New List
                </Button>
              </div>
            </div>
          )}
        </div>
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
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </main>
  );
}
