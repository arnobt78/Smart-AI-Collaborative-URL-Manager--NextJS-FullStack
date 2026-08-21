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

  const { data: overviewResult } = useBusinessOverviewQuery();
  const { data: activityResult } = useBusinessActivityQuery(30);
  const { data: popularResult } = useBusinessPopularQuery(activeTab === "popular");
  const { data: performanceResult } = useBusinessPerformanceQuery(
    activeTab === "performance",
  );
  const { data: globalResult } = useBusinessGlobalQuery(activeTab === "global");

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
          {overviewData ? (
            <OverviewCards data={overviewData} />
          ) : (
            dataSlot("overview")
          )}
          {activityData ? (
            <ActivityChart initialData={activityData} />
          ) : (
            dataSlot("activity")
          )}
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          {popularData ? (
            <PopularContent
              popularUrls={popularData.popularUrls}
              activeLists={popularData.activeLists}
            />
          ) : (
            dataSlot("popular URLs")
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {performanceData ? (
            <PerformanceMetrics data={performanceData} />
          ) : (
            dataSlot("performance metrics")
          )}
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          {globalData ? (
            <GlobalStats data={globalData} />
          ) : (
            dataSlot("global insights")
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
