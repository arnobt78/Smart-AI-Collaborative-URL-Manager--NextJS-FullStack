import type { LucideIcon } from "lucide-react";
import { BarChart3, Globe, LayoutList, Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataSurfaceSlot } from "@/components/ui/DataSurfaceSlot";
import { HEADING_STACK, PAGE_HEADER, PAGE_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

type RoutePageSkeletonProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  slotLabel: string;
  slotDescription: string;
  /** Lists uses a gradient title row instead of PageHeader. */
  variant?: "pageHeader" | "lists";
  className?: string;
};

/**
 * C6.6: Segment `loading.tsx` paints only `{children}` (Navbar/Footer stay).
 * Matches page chrome + a local DataSurfaceSlot — not a full-layout remount.
 */
export function RoutePageSkeleton({
  icon,
  title,
  description,
  slotLabel,
  slotDescription,
  variant = "pageHeader",
  className,
}: RoutePageSkeletonProps) {
  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK, className)}>
      {variant === "lists" ? (
        <div className={PAGE_HEADER}>
          <h1 className="text-lg sm:text-xl font-medium bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent leading-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-white/70 leading-snug">
            {description}
          </p>
        </div>
      ) : (
        <PageHeader icon={icon} title={title} description={description} />
      )}
      <DataSurfaceSlot label={slotLabel} description={slotDescription} />
    </div>
  );
}

/** Soft-nav shell for `/lists`. */
export function ListsRouteSkeleton() {
  return (
    <RoutePageSkeleton
      icon={LayoutList}
      title="My Lists"
      description="Manage and organize your URL collections"
      slotLabel="Preparing your lists"
      slotDescription="Loading your latest collections…"
      variant="lists"
    />
  );
}

/** Soft-nav shell for `/browse`. */
export function BrowseRouteSkeleton() {
  return (
    <RoutePageSkeleton
      icon={Globe}
      title="Discover Public Lists"
      description="Browse and explore curated URL collections from the community"
      slotLabel="Preparing public lists"
      slotDescription="Finding shared collections…"
    />
  );
}

/** Soft-nav shell for `/business-insights`. */
export function InsightsRouteSkeleton() {
  return (
    <RoutePageSkeleton
      icon={BarChart3}
      title="Business Insights"
      description="Track your URLs, lists, and engagement metrics"
      slotLabel="Preparing insights"
      slotDescription="Loading the latest analytics…"
    />
  );
}

/** Soft-nav shell for `/list/[slug]` — title chrome + local slot. */
export function ListDetailRouteSkeleton() {
  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK)}>
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-xl">
        <div className={HEADING_STACK}>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-300 shrink-0" aria-hidden />
            <h1 className="text-base sm:text-lg lg:text-xl font-medium text-white/70">
              Opening list…
            </h1>
          </div>
          <p className="text-sm text-white/50">Loading collection details</p>
        </div>
      </div>
      <DataSurfaceSlot
        label="Preparing list"
        description="Loading URLs and collaborators…"
      />
    </div>
  );
}
