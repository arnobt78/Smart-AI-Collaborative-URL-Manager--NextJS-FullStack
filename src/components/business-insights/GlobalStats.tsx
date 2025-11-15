"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-lg">
        <p className="text-white/60 text-sm mb-2">{label || ""}</p>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-white/60 mt-1">
              <span className="text-green-400">+{data.newUsersLast7Days}</span>{" "}
              new in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Live Users Now
            </CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.liveUsersNow}
            </div>
            <p className="text-xs text-white/60 mt-1">
              Active in last 15 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Total Lists
            </CardTitle>
            <List className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.totalLists.toLocaleString()}
            </div>
            <p className="text-xs text-white/60 mt-1">
              <span className="text-green-400">+{data.newListsLast7Days}</span>{" "}
              created in last 7 days
            </p>
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
              {data.totalUrls.toLocaleString()}
            </div>
            <p className="text-xs text-white/60 mt-1">
              <span className="text-green-400">+{data.newUrlsLast7Days}</span>{" "}
              added in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
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
              List Distribution
            </CardTitle>
            <div className="flex gap-2">
              <Globe className="h-4 w-4 text-green-400" />
              <Lock className="h-4 w-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  {data.publicLists} Public
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  {data.privateLists} Private
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Lists with Collaborators
            </CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.listsWithCollaborators}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            User Growth (Last 30 Days)
          </CardTitle>
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
                  style={{ fontSize: "12px" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#ffffff60" style={{ fontSize: "12px" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: "#ffffff60", fontSize: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
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
