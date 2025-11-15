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
      <main className="min-h-screen">
        <div className="container mx-auto px-2 sm:px-0">
          <div className="max-w-4xl mx-auto">
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-8 bg-white/10 rounded w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-white/10 rounded" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
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
    <main className="min-h-screen">
      <div className="container mx-auto px-2 sm:px-0">
        <div className="max-w-4xl mx-auto">
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
                        <h3 className="text-white font-medium">
                          {endpoint.name}
                        </h3>
                        {getStatusBadge(endpoint.status)}
                      </div>
                      <p className="text-white/60 text-sm font-mono">
                        {endpoint.endpoint}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-xs mb-1">
                        Response Time
                      </p>
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
      </div>
    </main>
  );
}
