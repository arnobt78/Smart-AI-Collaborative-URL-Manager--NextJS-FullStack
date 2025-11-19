"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react";

interface ApiStatus {
  status: {
    overall: string;
    database: string;
    uptime: number;
    timestamp: string;
  };
  endpoints: Array<{
    name: string;
    endpoint: string;
    status: string;
    responseTime: number;
  }>;
}

export default function ApiStatusPage() {
  const [statusData, setStatusData] = useState<ApiStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/business-insights/status");
      const data = await response.json();
      setStatusData(data);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading || !statusData) {
    return (
      <div className="min-h-screen w-full">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-white/10 rounded w-64 mb-2 animate-pulse" />
          <div className="h-5 bg-white/10 rounded w-96 animate-pulse" />
        </div>

        {/* Overall Status Card Skeleton */}
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-6 bg-white/10 rounded w-32" />
              <div className="h-6 w-24 bg-white/10 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="h-4 bg-white/10 rounded w-16 mb-1" />
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-white/10 rounded-full" />
                  <div className="h-4 bg-white/10 rounded w-24" />
                </div>
              </div>
              <div>
                <div className="h-4 bg-white/10 rounded w-12 mb-1" />
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-white/10 rounded-full" />
                  <div className="h-4 bg-white/10 rounded w-20" />
                </div>
              </div>
              <div>
                <div className="h-4 bg-white/10 rounded w-20 mb-1" />
                <div className="h-4 bg-white/10 rounded w-16" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints Card Skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-white/10 rounded w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="h-5 bg-white/10 rounded w-32" />
                      <div className="h-5 w-20 bg-white/10 rounded-full" />
                    </div>
                    <div className="h-4 bg-white/10 rounded w-64" />
                  </div>
                  <div className="text-right">
                    <div className="h-3 bg-white/10 rounded w-20 mb-1" />
                    <div className="h-5 bg-white/10 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    if (status === "operational") {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Operational
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Degraded
      </Badge>
    );
  };

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-400" />
          API Status
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Real-time monitoring of all API endpoints
        </p>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>System Status</CardTitle>
            {getStatusBadge(statusData.status.overall)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-white/60 text-sm mb-1">Database</p>
              <div className="flex items-center gap-2">
                {statusData.status.database === "operational" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                )}
                <span className="text-white font-medium capitalize">
                  {statusData.status.database}
                </span>
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Uptime</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-white font-medium">
                  {formatUptime(statusData.status.uptime)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Last Updated</p>
              <span className="text-white font-medium text-sm">
                {new Date(statusData.status.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusData.endpoints.map((endpoint) => (
              <div
                key={endpoint.endpoint}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-medium">{endpoint.name}</h3>
                    {getStatusBadge(endpoint.status)}
                  </div>
                  <p className="text-white/60 text-sm font-mono">
                    {endpoint.endpoint}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs mb-1">Response Time</p>
                  <p className="text-white font-semibold">
                    {endpoint.responseTime}ms
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
