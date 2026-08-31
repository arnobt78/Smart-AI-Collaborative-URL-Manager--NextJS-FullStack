/**
 * C7.0: Full My Lists card from UserList props — title, visibility, description,
 * stats/dates with icons, and view/edit/delete actions. Shared by ListsPage and
 * OptimisticSoftNavSurface so warm soft-nav paints complete cards (no late catch-up).
 * Chrome aligned with ListDetailHeaderChrome (Blocks / Badge / AlignLeft + CARD_STACK).
 */
"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  AlignLeft,
  Blocks,
  Calendar,
  Clock,
  Eye,
  Globe2,
  GlobeLock,
  Users,
} from "lucide-react";
import type { UserList } from "@/hooks/useListQueries";
import { CARD_PAD, CARD_STACK } from "@/lib/ui-spacing";
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
  const value =
    list[camelKey as keyof UserList] || list[snakeKey as keyof UserList];
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

const badgeTextClass = "text-xs text-center justify-center";

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
  const isPublic = list.isPublic ?? false;

  return (
    <div
      className={cn(
        "group relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-xl transition-all duration-300 hover:border-blue-400/40 hover:bg-white/10",
        CARD_PAD,
      )}
    >
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-start sm:gap-4">
        <div className={cn(CARD_STACK, "min-w-0 flex-1")}>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Blocks className="h-5 w-5 shrink-0 text-blue-300" aria-hidden />
            <button
              type="button"
              onClick={onView}
              className="max-w-full min-w-0 truncate text-left text-sm font-medium text-white transition-colors hover: -offset-2 group-hover:text-blue-300 sm:text-base"
            >
              {list.title || `List: ${list.slug}`}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Badge
              variant="secondary"
              className={cn(badgeTextClass, "inline-flex items-center w-fit")}
            >
              {urlCount} {urlCount === 1 ? "URL" : "URLs"}
            </Badge>
            {list.isPublic !== undefined && (
              <Badge
                variant={isPublic ? "success" : "secondary"}
                className={cn(
                  badgeTextClass,
                  "inline-flex items-center gap-1 w-fit",
                )}
              >
                {isPublic ? (
                  <>
                    <Globe2 className="w-3 h-3 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">Public</span>
                  </>
                ) : (
                  <>
                    <GlobeLock className="w-3 h-3 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">Private</span>
                  </>
                )}
              </Badge>
            )}
          </div>

          {description ? (
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <AlignLeft
                className="h-4 w-4 shrink-0 text-white/50"
                aria-hidden
              />
              <p className="min-w-0 text-xs sm:text-sm text-white/60 line-clamp-2">
                {description}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white/60">
            {collaboratorCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400"
                  aria-hidden
                />
                <span className="font-medium text-white/80">
                  {collaboratorCount}
                </span>
                <span className="hidden sm:inline">
                  {collaboratorCount === 1 ? "Collaborator" : "Collaborators"}
                </span>
              </span>
            )}

            {createdDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400"
                  aria-hidden
                />
                <span className="hidden sm:inline">Created</span>
                <span className="font-medium text-white/80">
                  {formatDate(createdDate)}
                </span>
              </span>
            )}

            {updatedDate &&
              createdDate &&
              new Date(updatedDate).getTime() !==
                new Date(createdDate).getTime() && (
                <span className="inline-flex items-center gap-1">
                  <Clock
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400"
                    aria-hidden
                  />
                  <span className="hidden sm:inline">Updated</span>
                  <span className="font-medium text-white/80">
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
  );
}
