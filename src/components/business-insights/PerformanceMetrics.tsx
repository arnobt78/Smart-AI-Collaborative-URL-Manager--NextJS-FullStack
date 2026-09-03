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
  LabelList,
} from "recharts";
import { TrendingUp, Link2, Users } from "lucide-react";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
import { InsightsChartTooltip } from "@/components/business-insights/InsightsChartTooltip";
import { CARD_PAD, HEADING_STACK } from "@/lib/ui-spacing";
import { UI_IDENTITY_GAP } from "@/lib/ui/control-styles";
import { GLASS_PANEL_CARD } from "@/lib/ui/glass-card-styles";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn(GLASS_PANEL_CARD.blue, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={TrendingUp} hue="blue" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Avg URLs per List
              </h3>
              <p className="text-xs text-white/60">Mean URLs across your lists</p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.avgUrlsPerList}
          </div>
        </div>

        <div className={cn(GLASS_PANEL_CARD.violet, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Users} hue="violet" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Lists with Collaborators
              </h3>
              <p className="text-xs text-white/60">Shared with at least one person</p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.listsWithCollaborators}
          </div>
        </div>

        <div className={cn(GLASS_PANEL_CARD.emerald, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Link2} hue="emerald" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Total URLs
              </h3>
              <p className="text-xs text-white/60">URLs across all lists</p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.totalUrls}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Public vs Private Distribution */}
        <Card className={CARD_PAD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">
              List Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full min-h-[256px]">
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props) => {
                      const {
                        cx,
                        cy,
                        midAngle,
                        outerRadius,
                        fill,
                        value,
                        name,
                        percent,
                      } = props as {
                        cx?: number;
                        cy?: number;
                        midAngle?: number;
                        outerRadius?: number;
                        fill?: string;
                        value?: number;
                        name?: string;
                        percent?: number;
                      };
                      if (
                        cx == null ||
                        cy == null ||
                        midAngle == null ||
                        outerRadius == null ||
                        !value
                      ) {
                        return null;
                      }
                      const RADIAN = Math.PI / 180;
                      const r = outerRadius + 16;
                      const x = cx + r * Math.cos(-midAngle * RADIAN);
                      const y = cy + r * Math.sin(-midAngle * RADIAN);
                      const pct =
                        percent != null
                          ? ` ${(percent * 100).toFixed(0)}%`
                          : "";
                      return (
                        <text
                          x={x}
                          y={y}
                          fill={fill || "#fff"}
                          fontSize={11}
                          fontWeight={500}
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                        >
                          {name}
                          {pct}
                        </text>
                      );
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<InsightsChartTooltip showPercent />}
                  />
                  <Legend
                    wrapperStyle={{ color: "#ffffff60", fontSize: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Lists by URL Count */}
        <Card className={CARD_PAD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">
              Top Lists by URL Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full min-h-[256px]">
              <ResponsiveContainer width="100%" height={256}>
                <BarChart
                  data={topListsData}
                  margin={{ top: 16, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="name"
                    stroke="#ffffff60"
                    style={{ fontSize: "10px" }}
                    className="text-[10px] sm:text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    cursor={{ fill: "rgba(255,255,255,0.06)" }}
                  />
                  <Bar
                    dataKey="urls"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    name="URLs"
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="urls"
                      position="top"
                      fill="#93c5fd"
                      fontSize={10}
                      formatter={(value) => {
                        const n =
                          typeof value === "number" ? value : Number(value);
                        return n > 0 ? String(n) : "";
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
