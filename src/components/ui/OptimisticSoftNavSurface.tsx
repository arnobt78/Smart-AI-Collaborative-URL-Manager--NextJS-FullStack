"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreateNewListButton } from "@/components/ui/CreateNewListButton";
import { Tabs } from "@/components/ui/Tabs";
import {
  BrowseRouteSkeleton,
  InsightsRouteSkeleton,
  ListDetailRouteSkeleton,
  ListsRouteSkeleton,
} from "@/components/ui/RoutePageSkeleton";
import { OverviewCards } from "@/components/business-insights/OverviewCards";
import { ActivityChart } from "@/components/business-insights/ActivityChart";
import { InsightsTabsList } from "@/components/business-insights/InsightsTabsList";
import { ListsPageChrome } from "@/components/lists/ListsPageChrome";
import { MyListsCard } from "@/components/lists/MyListsCard";
import { BrowsePublicListCard } from "@/components/lists/BrowsePublicListCard";
import { BrowseSearchField } from "@/components/lists/BrowseSearchField";
import {
  ListDetailBodySkeletons,
  ListDetailHeaderChrome,
} from "@/components/lists/ListDetailHeaderChrome";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import type { UserList } from "@/hooks/useListQueries";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { glassActionButtonClass } from "@/lib/ui/glass-button-styles";
import { LIST_STACK, PAGE_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

/**
 * C7.0: Warm soft-nav paints full chrome + cards from RQ (parity with real pages).
 * Create/edit/delete are visual-only while aria-busy; view navigates via warm push.
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
type ActivityCache = { activity?: Array<{ date: string; lists: number; urls: number }> };
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
  const { warmRouterPush } = useWarmSoftNav();
  const data = queryClient.getQueryData<ListsCache>(listQueryKeys.allLists());
  const lists = data?.lists;

  if (!data || !lists) {
    return <ListsRouteSkeleton />;
  }

  return (
    <div className={cn("w-full", PAGE_STACK)} aria-busy="true">
      <ListsPageChrome
        createSlot={
          <CreateNewListButton
            onClick={() => {
              /* C7.0: dialog opens on hydrated ListsPage after RSC */
            }}
          />
        }
      />
      <div className={LIST_STACK}>
        {lists.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-white/30 p-2 sm:p-4 text-center bg-white/5 backdrop-blur-md">
            <p className="text-sm text-white/60">No Lists Yet</p>
          </div>
        ) : (
          lists.map((list) => (
            <MyListsCard
              key={list.id}
              list={list}
              onView={() => warmRouterPush(`/list/${list.slug}`)}
              actionsDisabled
            />
          ))
        )}
      </div>
    </div>
  );
}

function BrowseOptimisticSurface() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const [filter, setFilter] = useState(searchParams.get("search") || "");
  // Warm check uses exact page key; paint from default page-1 cache when present
  const data =
    queryClient.getQueryData<BrowseCache>(
      browseQueryKeys.publicLists(page, ""),
    ) ??
    queryClient.getQueryData<BrowseCache>(
      browseQueryKeys.publicLists(1, ""),
    );
  const lists = data?.lists;

  if (!data || !lists) {
    return <BrowseRouteSkeleton />;
  }

  const q = filter.trim().toLowerCase();
  const filtered = !q
    ? lists
    : lists.filter((list) => {
        const title = (list.title || "").toLowerCase();
        const description = (list.description || "").toLowerCase();
        return title.includes(q) || description.includes(q);
      });

  return (
    <div className={cn("w-full", PAGE_STACK)} aria-busy="true">
      <PageHeader
        icon={Globe}
        title="Discover Public Lists"
        description="Browse and explore curated URL collections from the community"
      />
      <BrowseSearchField value={filter} onChange={setFilter} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((list) => (
          <BrowsePublicListCard key={list.id} list={list} />
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
  const activityResult = queryClient.getQueryData<ActivityCache>(
    browseQueryKeys.businessInsights.activity(30),
  );
  const overview = overviewResult?.overview;
  const activity = activityResult?.activity;

  if (!overview || activityResult == null) {
    return <InsightsRouteSkeleton />;
  }

  return (
    <div className={cn("w-full", PAGE_STACK)} aria-busy="true">
      <PageHeader
        icon={BarChart3}
        title="Business Insights"
        description="Track your URLs, lists, and engagement metrics"
      />
      <Tabs value="overview" className="w-full">
        <InsightsTabsList />
        <div className="mt-2 space-y-6">
          <OverviewCards data={overview} />
          {activity ? <ActivityChart initialData={activity} /> : null}
        </div>
      </Tabs>
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

  return (
    <div className={cn("w-full", PAGE_STACK)} aria-busy="true">
      <ListDetailHeaderChrome
        list={{
          slug: list.slug,
          title: list.title,
          description: list.description,
          isPublic: list.isPublic,
          urls: Array.isArray(list.urls) ? list.urls : [],
        }}
        busy
        canInvite={false}
        actions={
          <button
            type="button"
            disabled
            className={glassActionButtonClass("violet", "shrink-0 h-8 px-2 sm:px-3 text-xs")}
          >
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden />
            <span className="hidden sm:inline">Setup Schedule</span>
            <span className="sm:hidden">Schedule</span>
          </button>
        }
        shareRow={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap pt-2 border-t border-white/10 sm:border-t-0 sm:pt-0">
            <span className="text-xs sm:text-sm font-light text-white/70 whitespace-nowrap">
              Shareable Link:
            </span>
            <span className="text-xs sm:text-sm text-white/90 truncate">
              /list/{list.slug}
            </span>
          </div>
        }
      />
      <ListDetailBodySkeletons />
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
