"use client";

import { useState, useLayoutEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ListDetailShareRow } from "@/components/lists/ListDetailShareRow";
import { BarChart3, Globe } from "lucide-react";
import { ListDetailJobsMenu } from "@/components/lists/ListDetailJobsMenu";
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
  ListDetailBodySections,
  ListDetailBodySkeletons,
  ListDetailHeaderChrome,
} from "@/components/lists/ListDetailHeaderChrome";
import { UrlList } from "@/components/lists/UrlList";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import type { UserList } from "@/hooks/useListQueries";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { LIST_STACK, PAGE_STACK, HEADING_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";
import { syncCurrentListFromSeedRow, isUnifiedListHydrated, syncUnifiedSubCachesFromUnified } from "@/lib/soft-nav-cache";
import { Button } from "@/components/ui/Button";

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
type ActivityCache = {
  activity?: Array<{ date: string; lists: number; urls: number }>;
};
type UnifiedCache = {
  list?: {
    id?: string;
    slug?: string;
    title?: string | null;
    isPublic?: boolean;
    urls?: unknown[];
    description?: string | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    collaborators?: string[];
    collaboratorRoles?: unknown;
  };
  collaborators?: unknown[];
  activities?: unknown[];
  _softNavThinSeed?: boolean;
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
    queryClient.getQueryData<BrowseCache>(browseQueryKeys.publicLists(1, ""));
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          {/* C7.24: warm activity paints chart; cold still waits for real route */}
          {activity ? <ActivityChart initialData={activity} /> : null}
        </div>
      </Tabs>
    </div>
  );
}

function ListDetailOptimisticSurface() {
  const queryClient = useQueryClient();
  const { warmRouterPush } = useWarmSoftNav();
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string"
      ? decodeURIComponent(slugParam)
      : Array.isArray(slugParam)
        ? decodeURIComponent(slugParam[0] || "")
        : "";

  const data = slug
    ? queryClient.getQueryData<UnifiedCache>(listQueryKeys.unified(slug))
    : undefined;
  const list =
    data?.list?.slug && data.list.slug === slug ? data.list : undefined;

  const hydrated = isUnifiedListHydrated(data, slug);

  useLayoutEffect(() => {
    if (!list?.id || !list.slug) return;
    syncCurrentListFromSeedRow({
      id: list.id,
      slug: list.slug,
      title: list.title,
      description: list.description,
      isPublic: list.isPublic,
      urls: list.urls,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      collaborators: list.collaborators,
      collaboratorRoles: list.collaboratorRoles,
    });
    if (hydrated) {
      syncUnifiedSubCachesFromUnified(queryClient, data);
    }
  }, [list, hydrated, data, queryClient]);

  if (!slug) {
    return <ListDetailRouteSkeleton />;
  }

  // Tombstoned / deleted — never paint body skeletons behind not-found
  if (data && data.list == null) {
    return (
      <div className={cn("w-full", PAGE_STACK)}>
        <div className="text-center">
          <div className={HEADING_STACK}>
            <h1 className="text-lg sm:text-xl font-medium">List not found</h1>
            <p className="text-gray-600">
              The list you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
          </div>
          <Button href="/" className="mt-8">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!list?.slug) {
    return <ListDetailRouteSkeleton />;
  }

  const listSlug = list.slug;
  const urlCount = Array.isArray(list.urls) ? list.urls.length : 0;
  const knownCollaboratorCount = Array.isArray(list.collaborators)
    ? list.collaborators.length
    : undefined;

  return (
    <div className={cn("w-full", PAGE_STACK)} aria-busy="true">
      <ListDetailHeaderChrome
        list={{
          slug: listSlug,
          title: list.title,
          description: list.description,
          isPublic: list.isPublic,
          urls: Array.isArray(list.urls) ? list.urls : [],
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        }}
        busy
        canInvite={false}
        onBack={() => warmRouterPush("/lists")}
        actions={
          <ListDetailJobsMenu
            busy
            hasUrls={urlCount > 0}
          />
        }
        shareRow={
          <ListDetailShareRow
            slug={listSlug}
            createdAt={list.createdAt}
            updatedAt={list.updatedAt}
            copyDisabled
          />
        }
      />
      {hydrated && list.id ? (
        <ListDetailBodySections
          list={{
            id: list.id,
            slug: listSlug,
            title: list.title,
            urls: list.urls,
          }}
        />
      ) : (
        <ListDetailBodySkeletons
          urlCount={urlCount}
          knownCollaboratorCount={knownCollaboratorCount}
        />
      )}
      {/* C7.10.1: paint UrlList during soft-nav (parity with ListPage thin seed) */}
      <UrlList />
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
