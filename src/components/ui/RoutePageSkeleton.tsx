import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpen, Globe, LayoutList, Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataSurfaceSlot } from "@/components/ui/DataSurfaceSlot";
import { CARD_PAD, HEADING_STACK, PAGE_HEADER, PAGE_STACK } from "@/lib/ui-spacing";
import { GLASS_LIST_CARD } from "@/lib/ui/glass-card-styles";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { ListDetailBodySkeletons } from "@/components/lists/ListDetailHeaderChrome";
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
 * C6.6 / C7.3: Segment `loading.tsx` paints only `{children}` (Navbar/Footer stay).
 * Title + subtitle pulse while DataSurfaceSlot spins — matches destination chrome.
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
    <div className={cn("w-full", PAGE_STACK, className)}>
      {variant === "lists" ? (
        <div className={cn(PAGE_HEADER, "animate-pulse")}>
          <h1 className="text-lg sm:text-xl font-medium bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent leading-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-white/70 leading-snug">
            {description}
          </p>
        </div>
      ) : (
        <div className="animate-pulse">
          <PageHeader icon={icon} title={title} description={description} />
        </div>
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

/** C7.3: Soft-nav shell for `/api-docs`. */
export function ApiDocsRouteSkeleton() {
  return (
    <RoutePageSkeleton
      icon={BookOpen}
      title="API Documentation"
      description="Complete API reference for The Daily Urlist"
      slotLabel="Preparing API docs"
      slotDescription="Loading endpoint reference…"
    />
  );
}

/** Soft-nav shell for `/list/[slug]` — one continuous destination-shaped skeleton (C7.9). */
export function ListDetailRouteSkeleton() {
  return (
    <div className={cn("w-full", PAGE_STACK)} aria-busy="true">
      <div className={cn(GLASS_LIST_CARD, "animate-pulse", CARD_PAD)}>
        <div className={HEADING_STACK}>
          <div className="flex items-center gap-2">
            <Link2 className={cn(UI_ICON_CONTROL, "text-blue-300/50")} aria-hidden />
            <div className="h-5 w-40 sm:w-56 rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-5 w-16 rounded-full bg-white/10" />
            <div className="h-5 w-24 rounded-full bg-white/10" />
            <div className="h-5 w-10 rounded-full bg-white/10" />
          </div>
          <div className="h-3 w-2/3 max-w-md rounded bg-white/5 mt-2" />
        </div>
      </div>
      <ListDetailBodySkeletons />
      <div className="h-16 rounded-xl border border-dashed border-white/20 bg-white/5 animate-pulse" aria-hidden />
    </div>
  );
}
