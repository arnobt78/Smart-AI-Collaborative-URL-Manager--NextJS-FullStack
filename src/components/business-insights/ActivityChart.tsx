"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { InsightsChartTooltip } from "@/components/business-insights/InsightsChartTooltip";
import { useBusinessActivityQuery } from "@/hooks/useBrowseQueries";
import { CARD_PAD } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

interface ActivityData {
  date: string;
  lists: number;
  urls: number;
}

interface ActivityChartProps {
  initialData?: ActivityData[];
  initialLoading?: boolean;
}

/** Soft-nav / loading placeholder — avoids mounting a second live Recharts tree. */
export function ActivityChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn(CARD_PAD, "animate-pulse", className)} aria-hidden>
      <CardHeader className="pb-2">
        <div className="h-5 bg-white/10 rounded w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="h-8 rounded-lg bg-white/10" />
          <div className="h-8 rounded-lg bg-white/10" />
          <div className="h-8 rounded-lg bg-white/10" />
        </div>
        <div className="h-64 min-h-[256px] rounded-lg bg-white/10" />
      </CardContent>
    </Card>
  );
}

export function ActivityChart({
  initialData,
  initialLoading: _,
}: ActivityChartProps) {
  const [activeTab, setActiveTab] = useState<string>("30");
  const days = parseInt(activeTab, 10);

  const { data: activityResult, isLoading: isLoadingQuery } =
    useBusinessActivityQuery(days);
  const data = activityResult?.activity || initialData || [];
  const isLoading = isLoadingQuery && !initialData;

  const formattedData =
    data?.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    })) || [];

  const chartData =
    days === 7 ? formattedData.slice(-7) : formattedData;
  const showAngle = days >= 30;
  const showDots = days <= 30;

  if (isLoading && data.length === 0) {
    return <ActivityChartSkeleton />;
  }

  return (
    <Card className={CARD_PAD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base">
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          className="w-full"
          onValueChange={(value) => {
            setActiveTab(value);
          }}
        >
          <TabsList className="mb-4 grid grid-cols-3">
            <TabsTrigger
              value="7"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              7 Days
            </TabsTrigger>
            <TabsTrigger
              value="30"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              30 Days
            </TabsTrigger>
            <TabsTrigger
              value="90"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              90 Days
            </TabsTrigger>
          </TabsList>

          <div className="h-64 w-full min-h-[256px]">
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff60"
                  style={{ fontSize: "10px" }}
                  className="text-[10px] sm:text-xs"
                  angle={showAngle ? -45 : 0}
                  textAnchor={showAngle ? "end" : "middle"}
                  height={showAngle ? 60 : 30}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={36}
                  tickMargin={4}
                  allowDecimals={false}
                  stroke="#ffffff60"
                  style={{ fontSize: "10px" }}
                  className="text-[10px] sm:text-xs"
                />
                <Tooltip
                  content={<InsightsChartTooltip />}
                  cursor={{ stroke: "rgba(255,255,255,0.2)" }}
                />
                <Legend
                  wrapperStyle={{ color: "#ffffff60", fontSize: "10px" }}
                />
                <Line
                  type="monotone"
                  dataKey="lists"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={
                    showDots
                      ? { fill: "#3b82f6", r: days === 7 ? 3 : 2.5 }
                      : false
                  }
                  name="Lists Created"
                >
                  {showDots ? (
                    <LabelList
                      dataKey="lists"
                      position="top"
                      content={({ x, y, value }) => {
                        const n = typeof value === "number" ? value : Number(value);
                        if (!n || !Number.isFinite(n)) return null;
                        const px = typeof x === "number" ? x : Number(x);
                        const py = typeof y === "number" ? y : Number(y);
                        if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
                        return (
                          <text
                            x={px}
                            y={py}
                            dy={-8}
                            textAnchor="middle"
                            fill="#3b82f6"
                            fontSize={10}
                          >
                            {n}
                          </text>
                        );
                      }}
                    />
                  ) : null}
                </Line>
                <Line
                  type="monotone"
                  dataKey="urls"
                  stroke="#a855f7"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={
                    showDots
                      ? { fill: "#a855f7", r: days === 7 ? 3 : 2.5 }
                      : false
                  }
                  name="URLs Added"
                >
                  {showDots ? (
                    <LabelList
                      dataKey="urls"
                      position="top"
                      content={({ x, y, value }) => {
                        const n = typeof value === "number" ? value : Number(value);
                        if (!n || !Number.isFinite(n)) return null;
                        const px = typeof x === "number" ? x : Number(x);
                        const py = typeof y === "number" ? y : Number(y);
                        if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
                        return (
                          <text
                            x={px}
                            y={py}
                            dy={-8}
                            textAnchor="middle"
                            fill="#a855f7"
                            fontSize={10}
                          >
                            {n}
                          </text>
                        );
                      }}
                    />
                  ) : null}
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
