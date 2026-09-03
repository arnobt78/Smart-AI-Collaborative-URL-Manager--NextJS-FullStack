/**
 * C7.0: Shared My Lists page chrome — Stockly tile + title/subtitle + Create slot.
 * Used by ListsPage and OptimisticSoftNavSurface so warm soft-nav matches final UI.
 */
import type { ReactNode } from "react";
import { LayoutList } from "lucide-react";
import { IdentityHeading } from "@/components/ui/IdentityHeading";
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
      <IdentityHeading
        icon={LayoutList}
        title="My Lists"
        subtitle="Manage and organize your URL collections"
        hue="violet"
        className="min-w-0 flex-1"
      />
      <div className="shrink-0">{createSlot}</div>
    </div>
  );
}
