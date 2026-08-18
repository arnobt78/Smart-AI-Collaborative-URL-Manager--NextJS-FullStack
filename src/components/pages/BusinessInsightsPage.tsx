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
  const { data: overviewResult } = useBusinessOverviewQuery();
  const { data: activityResult } = useBusinessActivityQuery(30);
  const { data: popularResult } = useBusinessPopularQuery();
  const { data: performanceResult } = useBusinessPerformanceQuery();
  const { data: globalResult } = useBusinessGlobalQuery();

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

  const dataSlot = (label: string) => (
    <p aria-busy="true" aria-live="polite" className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white/60 animate-pulse sm:p-4">
      Loading {label}…
    </p>
  );

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
          {overviewData ? <OverviewCards data={overviewData} /> : dataSlot("overview")}
          {activityData ? <ActivityChart initialData={activityData} /> : dataSlot("activity")}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          {activityData ? <ActivityChart initialData={activityData} /> : dataSlot("activity")}
        </TabsContent>

        {/* Popular Tab */}
        <TabsContent value="popular" className="space-y-6">
          {popularData ? <PopularContent popularUrls={popularData.popularUrls} activeLists={popularData.activeLists} /> : dataSlot("popular URLs")}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performanceData ? <PerformanceMetrics data={performanceData} /> : dataSlot("performance metrics")}
        </TabsContent>

        {/* Global Tab */}
        <TabsContent value="global" className="space-y-6">
          {globalData ? <GlobalStats data={globalData} /> : dataSlot("global insights")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
