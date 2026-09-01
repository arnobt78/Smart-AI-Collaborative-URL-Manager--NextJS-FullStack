"use client";

import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatListDate(date: string | Date | null | undefined): string {
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

export function formatListRelativeTime(
  date: string | Date | null | undefined,
): string {
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
    return formatListDate(dateObj);
  } catch {
    return "Unknown";
  }
}

export type ListMetaDatesProps = {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  className?: string;
};

/** Created / Updated meta chips — shared by MyListsCard and list detail header. */
export function ListMetaDates({
  createdAt,
  updatedAt,
  className,
}: ListMetaDatesProps) {
  const created =
    createdAt instanceof Date
      ? createdAt
      : createdAt
        ? new Date(createdAt)
        : null;
  const updated =
    updatedAt instanceof Date
      ? updatedAt
      : updatedAt
        ? new Date(updatedAt)
        : null;

  const showUpdated =
    updated &&
    created &&
    updated.getTime() !== created.getTime();

  if (!created && !updated) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-white/60",
        className,
      )}
    >
      {created && (
        <span className="inline-flex items-center gap-1">
          <Calendar
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400 shrink-0"
            aria-hidden
          />
          <span className="hidden sm:inline">Created</span>
          <span className="font-medium text-white/80 break-words">
            {formatListDate(created)}
          </span>
        </span>
      )}
      {showUpdated && updated && (
        <span className="inline-flex items-center gap-1">
          <Clock
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400 shrink-0"
            aria-hidden
          />
          <span className="hidden sm:inline">Updated</span>
          <span className="font-medium text-white/80 break-words">
            {formatListRelativeTime(updated)}
          </span>
        </span>
      )}
    </div>
  );
}
