"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, Globe, Link2, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import {
  BrowseRouteSkeleton,
  InsightsRouteSkeleton,
  ListDetailRouteSkeleton,
  ListsRouteSkeleton,
} from "@/components/ui/RoutePageSkeleton";
import { OverviewCards } from "@/components/business-insights/OverviewCards";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import type { UserList } from "@/hooks/useListQueries";
import { CARD_PAD, LIST_STACK, PAGE_HEADER, PAGE_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

/**
 * C6.9: While segment loading.tsx waits on RSC, paint destination chrome +
 * cards from the singleton RQ cache when soft-nav was marked warm.
 * Never return empty — fall back to matching RoutePageSkeleton on race miss.
 */

export type OptimisticSoftNavVariant =
  | "lists"
  | "browse"
  | "insights"
  | "list-detail";

type ListsCache = { lists: UserList[] };
type BrowseCache = {
  lists: Array<{
    id: string;
    slug: string;
    title: string;
    description?: string;
    urls?: unknown[];
    user: { email: string };
  }>;
  pagination?: { totalPages?: number };
};
type InsightsOverviewCache = {
  overview: {
    totalLists: number;
    totalUrls: number;
    publicLists: number;
    privateLists: number;
    totalCollaborators: number;
    recentLists: number;
    recentUrls: number;
  };
};
type UnifiedCache = {
  list?: {
    slug?: string;
    title?: string | null;
    isPublic?: boolean;
    urls?: unknown[];
    description?: string | null;
  };
};

function ListsOptimisticSurface() {
  const queryClient = useQueryClient();
  const data = queryClient.getQueryData<ListsCache>(listQueryKeys.allLists());
  const lists = data?.lists;

  if (!data || !lists) {
    return <ListsRouteSkeleton />;
  }

  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK)} aria-busy="true">
      <div className={PAGE_HEADER}>
        <h1 className="text-lg sm:text-xl font-medium bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent leading-tight">
          My Lists
        </h1>
        <p className="text-sm sm:text-base text-white/70 leading-snug">
          Manage and organize your URL collections
        </p>
      </div>

      <div className={LIST_STACK}>
        {lists.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-white/30 p-2 sm:p-4 text-center bg-white/5 backdrop-blur-md">
            <p className="text-sm text-white/60">No Lists Yet</p>
          </div>
        ) : (
          lists.map((list) => {
            const urlCount = list.urls?.length || 0;
            return (
              <div
                key={list.id}
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md p-2 sm:p-4 shadow-md"
              >
                <div className="relative z-10 flex flex-wrap items-center gap-2">
                  <WarmSoftNavLink
                    href={`/list/${list.slug}`}
                    className="max-w-full min-w-0 truncate text-sm font-medium text-white sm:text-base"
                  >
                    {list.title || `List: ${list.slug}`}
                  </WarmSoftNavLink>
                  {list.isPublic !== undefined && (
                    <Badge
                      variant={list.isPublic ? "success" : "secondary"}
                      className="shrink-0 gap-1 px-2 py-0.5 text-xs leading-5"
                    >
                      {list.isPublic ? (
                        <Globe className="w-3 h-3" aria-hidden />
                      ) : (
                        <Lock className="w-3 h-3" aria-hidden />
                      )}
                      <span className="hidden sm:inline">
                        {list.isPublic ? "Public" : "Private"}
                      </span>
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs leading-5 text-white/80">
                    {urlCount} {urlCount === 1 ? "URL" : "URLs"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function BrowseOptimisticSurface() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const search = searchParams.get("search") || "";
  const data = queryClient.getQueryData<BrowseCache>(
    browseQueryKeys.publicLists(page, search),
  );
  const lists = data?.lists;

  if (!data || !lists) {
    return <BrowseRouteSkeleton />;
  }

  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK)} aria-busy="true">
      <PageHeader
        icon={Globe}
        title="Discover Public Lists"
        description="Browse and explore curated URL collections from the community"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <WarmSoftNavLink
            key={list.id}
            href={`/list/${list.slug}`}
            className={cn(
              "group bg-white/5 border border-white/10 rounded-xl flex flex-col gap-2",
              CARD_PAD,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base sm:text-lg font-medium text-white line-clamp-2 flex-1">
                {list.title}
              </h3>
              <Badge variant="success" className="flex-shrink-0 text-xs">
                <Globe className="w-3 h-3 mr-1" aria-hidden />
                <span className="hidden sm:inline">Public</span>
              </Badge>
            </div>
            {list.description ? (
              <p className="text-xs sm:text-sm text-white/60 line-clamp-2">
                {list.description}
              </p>
            ) : null}
            <div className="flex items-center gap-2 sm:gap-4 text-xs text-white/50 flex-wrap">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" aria-hidden />
                <span className="truncate max-w-[100px] sm:max-w-none">
                  {list.user.email.split("@")[0]}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" aria-hidden />
                <span>
                  {Array.isArray(list.urls) ? list.urls.length : 0} URLs
                </span>
              </div>
            </div>
          </WarmSoftNavLink>
        ))}
      </div>
    </div>
  );
}

function InsightsOptimisticSurface() {
  const queryClient = useQueryClient();
  const overviewResult = queryClient.getQueryData<InsightsOverviewCache>(
    browseQueryKeys.businessInsights.overview(),
  );
  const activityPresent = queryClient.getQueryData(
    browseQueryKeys.businessInsights.activity(30),
  );
  const overview = overviewResult?.overview;

  if (!overview || activityPresent == null) {
    return <InsightsRouteSkeleton />;
  }

  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK)} aria-busy="true">
      <PageHeader
        icon={BarChart3}
        title="Business Insights"
        description="Track your URLs, lists, and engagement metrics"
      />
      <OverviewCards data={overview} />
    </div>
  );
}

function ListDetailOptimisticSurface() {
  const queryClient = useQueryClient();
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string"
      ? decodeURIComponent(slugParam)
      : Array.isArray(slugParam)
        ? decodeURIComponent(slugParam[0] || "")
        : "";

  if (!slug) {
    return <ListDetailRouteSkeleton />;
  }

  const data = queryClient.getQueryData<UnifiedCache>(
    listQueryKeys.unified(slug),
  );
  const list = data?.list;

  if (!list || list.slug !== slug) {
    return <ListDetailRouteSkeleton />;
  }

  const urlCount = Array.isArray(list.urls) ? list.urls.length : 0;

  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK)} aria-busy="true">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-xl">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-300 shrink-0" aria-hidden />
            <h1 className="text-base sm:text-lg lg:text-xl font-medium text-white break-words">
              {list.title || `List: ${list.slug}`}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
              {urlCount} {urlCount === 1 ? "URL" : "URLs"}
            </Badge>
            {list.isPublic !== undefined && (
              <Badge
                variant={list.isPublic ? "success" : "secondary"}
                className="text-xs sm:text-sm flex items-center gap-1 w-fit"
              >
                {list.isPublic ? (
                  <Globe className="w-3 h-3" aria-hidden />
                ) : (
                  <Lock className="w-3 h-3" aria-hidden />
                )}
                <span className="hidden sm:inline">
                  {list.isPublic ? "Public" : "Private"}
                </span>
              </Badge>
            )}
          </div>
          {list.description ? (
            <p className="text-sm text-white/60 line-clamp-2">{list.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Paint RQ-backed destination UI for warm soft-nav segment loading. */
export function OptimisticSoftNavSurface({
  variant,
}: {
  variant: OptimisticSoftNavVariant;
}) {
  switch (variant) {
    case "lists":
      return <ListsOptimisticSurface />;
    case "browse":
      return <BrowseOptimisticSurface />;
    case "insights":
      return <InsightsOptimisticSurface />;
    case "list-detail":
      return <ListDetailOptimisticSurface />;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
