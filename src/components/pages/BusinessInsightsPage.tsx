"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { OverviewCards } from "@/components/business-insights/OverviewCards";
import { ActivityChart } from "@/components/business-insights/ActivityChart";
import { PopularContent } from "@/components/business-insights/PopularContent";
import { PerformanceMetrics } from "@/components/business-insights/PerformanceMetrics";
import { GlobalStats } from "@/components/business-insights/GlobalStats";
// Card components imported for type checking and potential future use
import { BarChart3, TrendingUp, Star, Zap, Globe } from "lucide-react";
import {
  useBusinessOverviewQuery,
  useBusinessActivityQuery,
  useBusinessPopularQuery,
  useBusinessPerformanceQuery,
  useBusinessGlobalQuery,
} from "@/hooks/useBrowseQueries";
import { cn } from "@/lib/utils";
import { PAGE_STACK } from "@/lib/ui-spacing";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataSurfaceSlot } from "@/components/ui/DataSurfaceSlot";
import { useDelayedPending } from "@/hooks/useDelayedPending";

// Type definitions for all data structures
interface _OverviewData {
  totalLists: number;
  totalUrls: number;
  publicLists: number;
  privateLists: number;
  totalCollaborators: number;
  recentLists: number;
  recentUrls: number;
}

interface _ActivityData {
  date: string;
  lists: number;
  urls: number;
}

interface PopularUrl {
  id: string;
  url: string;
  title?: string;
  listTitle: string;
  listSlug: string;
  isFavorite: boolean;
  clickCount?: number;
}

interface ActiveList {
  id: string;
  title: string;
  slug: string;
  urlCount: number;
  isPublic: boolean;
  collaborators: number;
}

interface _PopularData {
  popularUrls: PopularUrl[];
  activeLists: ActiveList[];
}

interface _PerformanceData {
  totalUrls: number;
  totalLists: number;
  avgUrlsPerList: number;
  publicCount: number;
  privateCount: number;
  listsWithCollaborators: number;
  topLists: Array<{
    slug: string;
    title: string;
    urlCount: number;
  }>;
}

interface _GlobalStatsData {
  totalUsers: number;
  totalLists: number;
  totalUrls: number;
  liveUsersNow: number;
  publicLists: number;
  privateLists: number;
  listsWithCollaborators: number;
  avgUrlsPerList: number;
  newUsersLast7Days: number;
  newListsLast7Days: number;
  newUrlsLast7Days: number;
  userGrowthData: Array<{ date: string; users: number }>;
}

export default function BusinessInsightsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // CRITICAL: Use React Query with Infinity cache - only refetches when invalidated
  const { data: overviewResult, isLoading: overviewLoading } =
    useBusinessOverviewQuery();
  const { data: activityResult, isLoading: activityLoading } =
    useBusinessActivityQuery(30);
  const { data: popularResult, isLoading: popularLoading } =
    useBusinessPopularQuery();
  const { data: performanceResult, isLoading: performanceLoading } =
    useBusinessPerformanceQuery();
  const { data: globalResult, isLoading: globalLoading } =
    useBusinessGlobalQuery();

  // Extract data from query results
  const overviewData = overviewResult?.overview || null;
  const activityData = activityResult?.activity;
  const popularData =
    popularResult?.popularUrls && popularResult?.activeLists
      ? {
          popularUrls: popularResult.popularUrls,
          activeLists: popularResult.activeLists,
        }
      : null;
  const performanceData = performanceResult?.performance || null;
  const globalData = globalResult?.global || null;

  // C6.6: delayed tab slots — avoid flash when RQ already has data
  const showOverviewSlot = useDelayedPending(
    overviewLoading,
    Boolean(overviewData),
  );
  const showActivitySlot = useDelayedPending(
    activityLoading,
    Boolean(activityData),
  );
  const showPopularSlot = useDelayedPending(
    popularLoading,
    Boolean(popularData),
  );
  const showPerformanceSlot = useDelayedPending(
    performanceLoading,
    Boolean(performanceData),
  );
  const showGlobalSlot = useDelayedPending(globalLoading, Boolean(globalData));

  const dataSlot = (label: string) => (
    <DataSurfaceSlot
      label={`Preparing ${label}`}
      description="Loading the latest analytics…"
    />
  );

  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK)}>
      {/* Header */}
      <PageHeader icon={BarChart3} title="Business Insights" description="Track your URLs, lists, and engagement metrics" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="popular"
            className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Star className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Popular</span>
            <span className="sm:hidden">Popular</span>
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger
            value="global"
            className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Global</span>
            <span className="sm:hidden">Global</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overviewData ? (
            <OverviewCards data={overviewData} />
          ) : showOverviewSlot ? (
            dataSlot("overview")
          ) : null}
          {activityData ? (
            <ActivityChart initialData={activityData} />
          ) : showActivitySlot ? (
            dataSlot("activity")
          ) : null}
        </TabsContent>

        {/* Popular Tab */}
        <TabsContent value="popular" className="space-y-6">
          {popularData ? (
            <PopularContent
              popularUrls={popularData.popularUrls}
              activeLists={popularData.activeLists}
            />
          ) : showPopularSlot ? (
            dataSlot("popular URLs")
          ) : null}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performanceData ? (
            <PerformanceMetrics data={performanceData} />
          ) : showPerformanceSlot ? (
            dataSlot("performance metrics")
          ) : null}
        </TabsContent>

        {/* Global Tab */}
        <TabsContent value="global" className="space-y-6">
          {globalData ? (
            <GlobalStats data={globalData} />
          ) : showGlobalSlot ? (
            dataSlot("global insights")
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
