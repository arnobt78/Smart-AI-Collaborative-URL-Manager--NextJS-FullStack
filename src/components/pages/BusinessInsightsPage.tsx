"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/Tabs";
import { OverviewCards } from "@/components/business-insights/OverviewCards";
import { ActivityChart } from "@/components/business-insights/ActivityChart";
import { PopularContent } from "@/components/business-insights/PopularContent";
import { PerformanceMetrics } from "@/components/business-insights/PerformanceMetrics";
import { GlobalStats } from "@/components/business-insights/GlobalStats";
import { InsightsTabsList } from "@/components/business-insights/InsightsTabsList";
import { BarChart3 } from "lucide-react";
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

/**
 * C7.0: Header + tabs always painted; tab labels centered via InsightsTabsList.
 */
export default function BusinessInsightsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data: overviewResult,
    isFetching: overviewFetching,
    isPlaceholderData: overviewPlaceholder,
  } = useBusinessOverviewQuery();
  const {
    data: activityResult,
    isFetching: activityFetching,
    isPlaceholderData: activityPlaceholder,
  } = useBusinessActivityQuery(30);
  const {
    data: popularResult,
    isFetching: popularFetching,
    isPlaceholderData: popularPlaceholder,
  } = useBusinessPopularQuery(activeTab === "popular");
  const {
    data: performanceResult,
    isFetching: performanceFetching,
    isPlaceholderData: performancePlaceholder,
  } = useBusinessPerformanceQuery(activeTab === "performance");
  const {
    data: globalResult,
    isFetching: globalFetching,
    isPlaceholderData: globalPlaceholder,
  } = useBusinessGlobalQuery(activeTab === "global");

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

  // Soft-nav keeps previous KPIs via placeholderData — hide stale flash while refetching
  const showOverviewLoading =
    !overviewData || (overviewFetching && overviewPlaceholder);
  const showActivityLoading =
    !activityData || (activityFetching && activityPlaceholder);
  // C7.32: Overview tab paints KPIs + chart together (no late catch-up feel)
  const showOverviewTabLoading = showOverviewLoading || showActivityLoading;
  const showPopularLoading =
    !popularData || (popularFetching && popularPlaceholder);
  const showPerformanceLoading =
    !performanceData || (performanceFetching && performancePlaceholder);
  const showGlobalLoading =
    !globalData || (globalFetching && globalPlaceholder);

  const dataSlot = (label: string) => (
    <DataSurfaceSlot
      label={`Preparing ${label}`}
      description="Loading the latest analytics…"
    />
  );

  return (
    <div className={cn("w-full", PAGE_STACK)}>
      <PageHeader
        icon={BarChart3}
        title="Business Insights"
        description="Track your URLs, lists, and engagement metrics"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <InsightsTabsList />

        <TabsContent value="overview" className="space-y-6">
          {showOverviewTabLoading ? (
            <>
              <OverviewCards isLoading />
              {dataSlot("activity")}
            </>
          ) : (
            <>
              <OverviewCards data={overviewData} />
              <ActivityChart initialData={activityData} />
            </>
          )}
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          {showPopularLoading || !popularData ? (
            dataSlot("popular URLs")
          ) : (
            <PopularContent
              popularUrls={popularData.popularUrls}
              activeLists={popularData.activeLists}
            />
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {showPerformanceLoading || !performanceData ? (
            dataSlot("performance metrics")
          ) : (
            <PerformanceMetrics data={performanceData} />
          )}
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          {showGlobalLoading || !globalData ? (
            dataSlot("global insights")
          ) : (
            <GlobalStats data={globalData} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
