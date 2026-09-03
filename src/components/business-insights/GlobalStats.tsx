"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
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
import {
  Users,
  Link2,
  Globe,
  Lock,
  TrendingUp,
  Activity,
  UserPlus,
  List,
} from "lucide-react";
import { CARD_PAD, HEADING_STACK } from "@/lib/ui-spacing";
import { InsightsChartTooltip } from "@/components/business-insights/InsightsChartTooltip";
import {
  UI_ICON_CONTROL,
  UI_IDENTITY_GAP,
} from "@/lib/ui/control-styles";
import { GLASS_PANEL_CARD } from "@/lib/ui/glass-card-styles";
import { cn } from "@/lib/utils";

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

interface GlobalStatsProps {
  data: GlobalStatsData;
  isLoading?: boolean;
}

export function GlobalStats({ data, isLoading }: GlobalStatsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-white/10 rounded w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-white/10 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-white/10 rounded w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-white/10 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format user growth data for chart
  const formattedGrowthData = data.userGrowthData.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn(GLASS_PANEL_CARD.blue, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Users} hue="blue" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Total Users
              </h3>
              <p className="text-xs text-white/60">
                <span className="text-green-400">+{data.newUsersLast7Days}</span>{" "}
                new in last 7 days
              </p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.totalUsers.toLocaleString()}
          </div>
        </div>

        <div className={cn(GLASS_PANEL_CARD.emerald, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Activity} hue="emerald" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Live Users Now
              </h3>
              <p className="text-xs text-white/60">Active in last 15 minutes</p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.liveUsersNow}
          </div>
        </div>

        <div className={cn(GLASS_PANEL_CARD.violet, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={List} hue="violet" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Total Lists
              </h3>
              <p className="text-xs text-white/60">
                <span className="text-green-400">+{data.newListsLast7Days}</span>{" "}
                created in last 7 days
              </p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.totalLists.toLocaleString()}
          </div>
        </div>

        <div className={cn(GLASS_PANEL_CARD.sky, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Link2} hue="sky" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Total URLs
              </h3>
              <p className="text-xs text-white/60">
                <span className="text-green-400">+{data.newUrlsLast7Days}</span>{" "}
                added in last 7 days
              </p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.totalUrls.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn(GLASS_PANEL_CARD.blue, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={TrendingUp} hue="blue" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Avg URLs per List
              </h3>
              <p className="text-xs text-white/60">Platform-wide mean</p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.avgUrlsPerList}
          </div>
        </div>

        <div className={cn(GLASS_PANEL_CARD.emerald, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Globe} hue="emerald" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                List Distribution
              </h3>
              <p className="text-xs text-white/60">Public vs private</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 sm:gap-4 flex-wrap">
            <Badge variant="success" className="text-xs gap-1">
              <Globe className={UI_ICON_CONTROL} />
              {data.publicLists} Public
            </Badge>
            <Badge variant="warning" className="text-xs gap-1">
              <Lock className={UI_ICON_CONTROL} />
              {data.privateLists} Private
            </Badge>
          </div>
        </div>

        <div className={cn(GLASS_PANEL_CARD.violet, CARD_PAD)}>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Users} hue="violet" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                Lists with Collaborators
              </h3>
              <p className="text-xs text-white/60">People with list access</p>
            </div>
          </div>
          <div className="mt-3 text-lg sm:text-xl font-medium text-white">
            {data.listsWithCollaborators}
          </div>
        </div>
      </div>

      {/* User Growth Chart */}
      <Card className={CARD_PAD}>
        <CardHeader className="pb-2">
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={UserPlus} hue="blue" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <CardTitle className="text-sm sm:text-base">
                User Growth (Last 30 Days)
              </CardTitle>
              <p className="text-xs text-white/60">New accounts over time</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="h-64 w-full min-h-[256px]"
            style={{ minHeight: "256px" }}
          >
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={formattedGrowthData}>
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
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
