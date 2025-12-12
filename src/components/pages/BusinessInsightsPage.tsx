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

// Type definitions for all data structures
interface OverviewData {
  totalLists: number;
  totalUrls: number;
  publicLists: number;
  privateLists: number;
  totalCollaborators: number;
  recentLists: number;
  recentUrls: number;
}

interface ActivityData {
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

interface PopularData {
  popularUrls: PopularUrl[];
  activeLists: ActiveList[];
}

interface PerformanceData {
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

interface GlobalStatsData {
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
  props: BusinessInsightsPageProps = {}
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

  // Check if any query is loading
  const isLoading =
    isLoadingOverview ||
    isLoadingActivity ||
    isLoadingPopular ||
    isLoadingPerformance ||
    isLoadingGlobal;

  // Ensure props and Card imports are considered used (for future extensibility)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _propsReference = props;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _cardReference = _cardTypeCheck;
  // References used to prevent unused warnings while keeping imports available
  void _propsReference;
  void _cardReference;

  if (isLoading && !overviewData && !activityData && !popularData) {
    return (
      <div className="min-h-screen w-full">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-white/10 rounded w-64 mb-2 animate-pulse flex items-center gap-3">
            <div className="h-8 w-8 bg-white/10 rounded" />
            <div className="h-6 bg-white/10 rounded flex-1" />
          </div>
          <div className="h-5 bg-white/10 rounded w-96 animate-pulse" />
        </div>

        {/* Tabs Skeleton */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-white/10 rounded animate-pulse" />
            ))}
          </TabsList>

          {/* Overview Tab Content Skeleton */}
          <TabsContent value="overview" className="space-y-6">
            {/* OverviewCards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 bg-white/10 rounded w-24" />
                    <div className="h-8 w-8 bg-white/10 rounded-lg" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-white/10 rounded w-16 mb-1" />
                    <div className="h-3 bg-white/10 rounded w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ActivityChart Skeleton */}
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-white/10 rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-white/10 rounded w-20" />
                  ))}
                </div>
                <div className="h-64 bg-white/10 rounded" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3 flex-wrap">
          <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-400 flex-shrink-0" />
          <span>Business Insights</span>
        </h1>
        <p className="text-white/60 text-xs sm:text-sm lg:text-base">
          Track your URLs, lists, and engagement metrics
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4 sm:mb-6 gap-1 sm:gap-2">
          <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Activity</span>
            <span className="sm:hidden">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="popular" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
            <Star className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Popular</span>
            <span className="sm:hidden">Popular</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Global</span>
            <span className="sm:hidden">Global</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overviewData && (
            <>
              <OverviewCards data={overviewData} isLoading={isLoading} />
              <ActivityChart
                initialData={activityData}
                initialLoading={isLoading}
              />
            </>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <ActivityChart
            initialData={activityData}
            initialLoading={isLoading}
          />
        </TabsContent>

        {/* Popular Tab */}
        <TabsContent value="popular" className="space-y-6">
          {popularData && (
            <PopularContent
              popularUrls={popularData.popularUrls}
              activeLists={popularData.activeLists}
              isLoading={isLoading}
            />
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performanceData && (
            <PerformanceMetrics data={performanceData} isLoading={isLoading} />
          )}
        </TabsContent>

        {/* Global Tab */}
        <TabsContent value="global" className="space-y-6">
          {globalData && (
            <GlobalStats data={globalData} isLoading={isLoading} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
