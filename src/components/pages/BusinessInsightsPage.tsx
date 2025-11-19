"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { OverviewCards } from "@/components/business-insights/OverviewCards";
import { ActivityChart } from "@/components/business-insights/ActivityChart";
import { PopularContent } from "@/components/business-insights/PopularContent";
import { PerformanceMetrics } from "@/components/business-insights/PerformanceMetrics";
import { GlobalStats } from "@/components/business-insights/GlobalStats";
// Card components imported for type checking and potential future use
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BarChart3, TrendingUp, Star, Zap, Globe } from "lucide-react";

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
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[] | undefined>(
    undefined
  );
  const [popularData, setPopularData] = useState<PopularData | null>(null);
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [globalData, setGlobalData] = useState<GlobalStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Ensure props and Card imports are considered used (for future extensibility)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _propsReference = {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _cardReference = _cardTypeCheck;

  useEffect(() => {
    fetchData();
    // References used to prevent unused warnings while keeping imports available
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void _propsReference;
    void _cardReference;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [overview, activity, popular, performance, global] =
        await Promise.all([
          fetch("/api/business-insights/overview").then((r) => r.json()),
          fetch("/api/business-insights/activity?days=30").then((r) =>
            r.json()
          ),
          fetch("/api/business-insights/popular").then((r) => r.json()),
          fetch("/api/business-insights/performance").then((r) => r.json()),
          fetch("/api/business-insights/global").then((r) => r.json()),
        ]);

      if (overview.overview) setOverviewData(overview.overview);
      if (activity.activity)
        setActivityData(activity.activity as ActivityData[]);
      if (popular.popularUrls && popular.activeLists) {
        setPopularData({
          popularUrls: popular.popularUrls,
          activeLists: popular.activeLists,
        });
      }
      if (performance.performance) setPerformanceData(performance.performance);
      if (global.global) setGlobalData(global.global);
    } catch (error) {
      console.error("Failed to fetch business insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-400" />
          Business Insights
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Track your URLs, lists, and engagement metrics
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="popular" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Popular
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Global
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
