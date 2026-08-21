/**
 * C7.0: Shared My Lists page chrome — gradient title + subtitle + Create slot.
 * Used by ListsPage and OptimisticSoftNavSurface so warm soft-nav matches final UI.
 */
import type { ReactNode } from "react";
import { PAGE_HEADER } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

type ListsPageChromeProps = {
  createSlot: ReactNode;
  className?: string;
};

export function ListsPageChrome({ createSlot, className }: ListsPageChromeProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className,
      )}
    >
      <div className={PAGE_HEADER}>
        <h1 className="text-lg sm:text-xl font-medium bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent leading-tight">
          My Lists
        </h1>
        <p className="text-sm sm:text-base text-white/70 leading-snug">
          Manage and organize your URL collections
        </p>
      </div>
      {createSlot}
    </div>
  );
}
