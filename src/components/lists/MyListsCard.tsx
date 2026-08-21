/**
 * C7.0: Full My Lists card from UserList props — title, visibility, description,
 * stats/dates with icons, and view/edit/delete actions. Shared by ListsPage and
 * OptimisticSoftNavSurface so warm soft-nav paints complete cards (no late catch-up).
 */
"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LinkIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Globe, Lock, Calendar, Clock, Eye, Users } from "lucide-react";
import type { UserList } from "@/hooks/useListQueries";
import { cn } from "@/lib/utils";

function formatDate(date: string | Date | null | undefined): string {
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
}

function formatRelativeTime(date: string | Date | null | undefined): string {
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
}

function getListDate(
  list: UserList,
  field: "created" | "updated",
): Date | null {
  const camelKey = field === "created" ? "createdAt" : "updatedAt";
  const snakeKey = field === "created" ? "created_at" : "updated_at";
  const value = list[camelKey as keyof UserList] || list[snakeKey as keyof UserList];
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export type MyListsCardProps = {
  list: UserList;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deletePending?: boolean;
  /** When true (warm soft-nav loading), edit/delete are visual only. */
  actionsDisabled?: boolean;
};

export function MyListsCard({
  list,
  onView,
  onEdit,
  onDelete,
  deletePending = false,
  actionsDisabled = false,
}: MyListsCardProps) {
  const createdDate = getListDate(list, "created");
  const updatedDate = getListDate(list, "updated");
  const urlCount = list.urls?.length || 0;
  const collaboratorCount = list.collaborators?.length || 0;
  const description = list.description || "";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md p-2 sm:p-4 shadow-md hover:shadow-xl transition-all duration-300 hover:border-blue-400/40 hover:from-white/10 hover:to-white/5",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-300 rounded-xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1 min-w-0">
            {/* Row 1: title + visibility */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onView}
                className="max-w-full min-w-0 truncate text-left text-sm font-medium text-white transition-colors hover:underline underline-offset-2 group-hover:text-blue-300 sm:text-base"
              >
                {list.title || `List: ${list.slug}`}
              </button>
              {list.isPublic !== undefined && (
                <Badge
                  variant={list.isPublic ? "success" : "secondary"}
                  className="shrink-0 gap-1 px-2 py-0.5 text-xs leading-5"
                >
                  {list.isPublic ? (
                    <>
                      <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden />
                      <span className="hidden sm:inline">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden />
                      <span className="hidden sm:inline">Private</span>
                    </>
                  )}
                </Badge>
              )}
            </div>

            {/* Row 2: optional description */}
            {description ? (
              <p className="text-sm text-white/70 line-clamp-2">{description}</p>
            ) : null}

            {/* Row 3: URL / collaborators / dates with icons */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 leading-5 text-white/80">
                <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" aria-hidden />
                <span className="font-medium">{urlCount}</span>
                <span className="text-white/60 hidden sm:inline">
                  {urlCount === 1 ? "URL" : "URLs"}
                </span>
              </span>

              {collaboratorCount > 0 && (
                <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 leading-5 text-white/80">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" aria-hidden />
                  <span className="font-medium">{collaboratorCount}</span>
                  <span className="text-white/60 hidden sm:inline">
                    {collaboratorCount === 1 ? "Collaborator" : "Collaborators"}
                  </span>
                </span>
              )}

              {createdDate && (
                <span className="flex items-center gap-1 text-white/60">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" aria-hidden />
                  <span className="hidden sm:inline">Created</span>
                  <span className="font-medium">{formatDate(createdDate)}</span>
                </span>
              )}

              {updatedDate &&
                createdDate &&
                new Date(updatedDate).getTime() !==
                  new Date(createdDate).getTime() && (
                  <span className="flex items-center gap-1 text-white/60">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" aria-hidden />
                    <span className="hidden sm:inline">Updated</span>
                    <span className="font-medium">
                      {formatRelativeTime(updatedDate)}
                    </span>
                  </span>
                )}
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
            <Button
              onClick={onView}
              variant="ghost"
              className="p-2 text-white/80 transition-colors hover:border-blue-400/30 hover:bg-blue-500/20 hover:text-blue-400"
              title="View List"
              aria-label={`View ${list.title || list.slug}`}
            >
              <Eye className="size-4" aria-hidden />
            </Button>
            <Button
              onClick={() => {
                if (!actionsDisabled) onEdit?.();
              }}
              variant="ghost"
              disabled={actionsDisabled || !onEdit}
              className="border border-transparent p-2 text-white/80 transition-colors hover:border-blue-400/30 hover:bg-blue-500/20 hover:text-blue-400 disabled:opacity-60"
              title="Edit List"
              aria-label={`Edit ${list.title || list.slug}`}
            >
              <PencilIcon className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              onClick={() => {
                if (!actionsDisabled) onDelete?.();
              }}
              variant="ghost"
              disabled={actionsDisabled || deletePending || !onDelete}
              className="border border-transparent p-2 text-white/80 transition-colors hover:border-red-400/30 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-60"
              title="Delete List"
              aria-label={`Delete ${list.title || list.slug}`}
            >
              <TrashIcon className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
