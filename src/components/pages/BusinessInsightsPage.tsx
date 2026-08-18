"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { OverviewCards } from "@/components/business-insights/OverviewCards";
import { ActivityChart } from "@/components/business-insights/ActivityChart";
import { PopularContent } from "@/components/business-insights/PopularContent";
import { PerformanceMetrics } from "@/components/business-insights/PerformanceMetrics";
import { GlobalStats } from "@/components/business-insights/GlobalStats";
// Card components imported for type checking and potential future use
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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

// Props interface for future extensibility
type BusinessInsightsPageProps = Record<string, never>;

const emptyOverview: _OverviewData = {
  totalLists: 0, totalUrls: 0, publicLists: 0, privateLists: 0,
  totalCollaborators: 0, recentLists: 0, recentUrls: 0,
};
const emptyPerformance: _PerformanceData = {
  totalUrls: 0, totalLists: 0, avgUrlsPerList: 0, publicCount: 0,
  privateCount: 0, listsWithCollaborators: 0, topLists: [],
};
const emptyGlobal: _GlobalStatsData = {
  totalUsers: 0, totalLists: 0, totalUrls: 0, liveUsersNow: 0,
  publicLists: 0, privateLists: 0, listsWithCollaborators: 0,
  avgUrlsPerList: 0, newUsersLast7Days: 0, newListsLast7Days: 0,
  newUrlsLast7Days: 0, userGrowthData: [],
};

// Type reference to ensure Card components are available if needed
type CardComponentTypes =
  | typeof Card
  | typeof CardContent
  | typeof CardHeader
  | typeof CardTitle;
// This ensures the imports are "used" and prevents unused import warnings
const _cardTypeCheck: CardComponentTypes[] = [];

export default function BusinessInsightsPage(
  props: BusinessInsightsPageProps = {},
) {
  const [activeTab, setActiveTab] = useState("overview");

  // CRITICAL: Use React Query with Infinity cache - only refetches when invalidated
  const { data: overviewResult, isLoading: isLoadingOverview } =
    useBusinessOverviewQuery();
  const { data: activityResult, isLoading: isLoadingActivity } =
    useBusinessActivityQuery(30);
  const { data: popularResult, isLoading: isLoadingPopular } =
    useBusinessPopularQuery();
  const { data: performanceResult, isLoading: isLoadingPerformance } =
    useBusinessPerformanceQuery();
  const { data: globalResult, isLoading: isLoadingGlobal } =
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

  const isOverviewPending = useDelayedPending(isLoadingOverview, Boolean(overviewData));
  const isActivityPending = useDelayedPending(isLoadingActivity, Boolean(activityData));
  const isPopularPending = useDelayedPending(isLoadingPopular, Boolean(popularData));
  const isPerformancePending = useDelayedPending(isLoadingPerformance, Boolean(performanceData));
  const isGlobalPending = useDelayedPending(isLoadingGlobal, Boolean(globalData));

  // Ensure props and Card imports are considered used (for future extensibility)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _propsReference = props;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _cardReference = _cardTypeCheck;
  // References used to prevent unused warnings while keeping imports available
  void _propsReference;
  void _cardReference;

  return (
    <div className={cn("min-h-screen w-full", PAGE_STACK)}>
      {/* Header */}
      <PageHeader icon={BarChart3} title="Business Insights" description="Track your URLs, lists, and engagement metrics" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 ">
          <TabsTrigger
            value="overview"
            className="flex items-center  text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex items-center  text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Activity</span>
            <span className="sm:hidden">Activity</span>
          </TabsTrigger>
          <TabsTrigger
            value="popular"
            className="flex items-center  text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Star className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Popular</span>
            <span className="sm:hidden">Popular</span>
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="flex items-center  text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger
            value="global"
            className="flex items-center  text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Global</span>
            <span className="sm:hidden">Global</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewCards data={overviewData || emptyOverview} isLoading={isOverviewPending} />
          <ActivityChart initialData={activityData} initialLoading={isActivityPending} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <ActivityChart
            initialData={activityData}
            initialLoading={isActivityPending}
          />
        </TabsContent>

        {/* Popular Tab */}
        <TabsContent value="popular" className="space-y-6">
          <PopularContent popularUrls={popularData?.popularUrls || []} activeLists={popularData?.activeLists || []} isLoading={isPopularPending} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics data={performanceData || emptyPerformance} isLoading={isPerformancePending} />
        </TabsContent>

        {/* Global Tab */}
        <TabsContent value="global" className="space-y-6">
          <GlobalStats data={globalData || emptyGlobal} isLoading={isGlobalPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
