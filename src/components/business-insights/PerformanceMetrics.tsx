"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Link2 } from "lucide-react";

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

interface PerformanceMetricsProps {
  data: PerformanceData;
  isLoading?: boolean;
}

interface PieLabelProps {
  name: string;
  percent: number;
  value: number;
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
}

interface TooltipPayload {
  name?: string;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

export function PerformanceMetrics({
  data,
  isLoading,
}: PerformanceMetricsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <div className="h-64 bg-white/10 rounded" />
        </Card>
      </div>
    );
  }

  const distributionData = [
    { name: "Public Lists", value: data.publicCount, color: "#10b981" },
    { name: "Private Lists", value: data.privateCount, color: "#f59e0b" },
  ];

  const topListsData = data.topLists.map((list) => ({
    name:
      list.title.length > 15 ? list.title.substring(0, 15) + "..." : list.title,
    urls: list.urlCount,
  }));

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length && payload[0]) {
      const firstPayload = payload[0];
      return (
        <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-white text-sm font-semibold mb-1">
            {firstPayload.name || "Unknown"}
          </p>
          <p
            className="text-white text-sm"
            style={{ color: firstPayload.color }}
          >
            Count:{" "}
            <span className="font-semibold">{firstPayload.value ?? "N/A"}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Avg URLs per List
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.avgUrlsPerList}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Lists with Collaborators
            </CardTitle>
            <Link2 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.listsWithCollaborators}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Total URLs
            </CardTitle>
            <Link2 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.totalUrls}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Public vs Private Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>List Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="h-64 w-full min-h-[256px]"
              style={{ minHeight: "256px" }}
            >
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props) => {
                      const { name, percent } =
                        props as unknown as PieLabelProps;
                      return `${name}: ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: "#ffffff60", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Lists by URL Count */}
        <Card>
          <CardHeader>
            <CardTitle>Top Lists by URL Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="h-64 w-full min-h-[256px]"
              style={{ minHeight: "256px" }}
            >
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={topListsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="name"
                    stroke="#ffffff60"
                    style={{ fontSize: "12px" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#ffffff60" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="urls" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
