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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useBusinessActivityQuery } from "@/hooks/useBrowseQueries";

interface ActivityData {
  date: string;
  lists: number;
  urls: number;
}

interface ActivityChartProps {
  initialData?: ActivityData[];
  initialLoading?: boolean;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  payload?: {
    date: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-lg">
        <p className="text-white/60 text-sm mb-2">
          {payload[0]?.payload?.date}
        </p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-white text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ActivityChart({
  initialData,
  initialLoading,
}: ActivityChartProps) {
  const [activeTab, setActiveTab] = useState<string>("30");
  const days = parseInt(activeTab);

  // CRITICAL: Use React Query with Infinity cache - only refetches when invalidated
  const { data: activityResult, isLoading: isLoadingQuery } =
    useBusinessActivityQuery(days);
  const data = activityResult?.activity || initialData || [];
  const isLoading = isLoadingQuery && !initialData;

  // Format dates for display
  const formattedData =
    data?.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    })) || [];

  if (isLoading && data.length === 0) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-white/10 rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-white/10 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          className="w-full"
          onValueChange={(value) => {
            setActiveTab(value);
          }}
        >
          <TabsList className="mb-4 grid grid-cols-3 gap-1 sm:gap-2">
            <TabsTrigger value="7" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">7 Days</TabsTrigger>
            <TabsTrigger value="30" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">30 Days</TabsTrigger>
            <TabsTrigger value="90" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">90 Days</TabsTrigger>
          </TabsList>
          <TabsContent value="7" className="mt-0">
            <div
              className="h-64 w-full min-h-[256px]"
              style={{ minHeight: "256px" }}
            >
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={formattedData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff60"
                    style={{ fontSize: "10px" }}
                    className="text-[10px] sm:text-xs"
                  />
                  <YAxis stroke="#ffffff60" style={{ fontSize: "10px" }} className="text-[10px] sm:text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: "#ffffff60", fontSize: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lists"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    name="Lists Created"
                  />
                  <Line
                    type="monotone"
                    dataKey="urls"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: "#a855f7", r: 3 }}
                    name="URLs Added"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="30" className="mt-0">
            <div
              className="h-64 w-full min-h-[256px]"
              style={{ minHeight: "256px" }}
            >
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff60"
                    style={{ fontSize: "10px" }}
                    className="text-[10px] sm:text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#ffffff60" style={{ fontSize: "10px" }} className="text-[10px] sm:text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: "#ffffff60", fontSize: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lists"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 2.5 }}
                    name="Lists Created"
                  />
                  <Line
                    type="monotone"
                    dataKey="urls"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: "#a855f7", r: 2.5 }}
                    name="URLs Added"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="90" className="mt-0">
            <div
              className="h-64 w-full min-h-[256px]"
              style={{ minHeight: "256px" }}
            >
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff60"
                    style={{ fontSize: "10px" }}
                    className="text-[10px] sm:text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#ffffff60" style={{ fontSize: "10px" }} className="text-[10px] sm:text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: "#ffffff60", fontSize: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lists"
                    stroke="#3b82f7"
                    strokeWidth={2}
                    dot={false}
                    name="Lists Created"
                  />
                  <Line
                    type="monotone"
                    dataKey="urls"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    name="URLs Added"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
