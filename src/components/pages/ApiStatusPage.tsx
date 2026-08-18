"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react";
import { useApiStatusQuery } from "@/hooks/useBrowseQueries";
import { cn } from "@/lib/utils";
import { PAGE_STACK } from "@/lib/ui-spacing";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDelayedPending } from "@/hooks/useDelayedPending";

export default function ApiStatusPage() {
  // CRITICAL: Use React Query with refetchInterval for real-time status monitoring
  // This polls every 30 seconds automatically - no manual setInterval needed
  const { data: statusData, isLoading } = useApiStatusQuery();
  const showInlinePending = useDelayedPending(isLoading, Boolean(statusData));

  const formatUptime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

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
    <div className={cn("min-h-screen w-full", PAGE_STACK)}>
      {/* Header */}
      <PageHeader icon={Activity} title="API Status" description="Real-time monitoring of all API endpoints" />

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <CardTitle className="text-base sm:text-lg">
              System Status
            </CardTitle>
            {statusData?.status ? getStatusBadge(statusData.status.overall) : showInlinePending ? <span className="h-5 w-24 rounded-full bg-white/10" aria-label="Loading status" /> : <span className="text-sm text-white/50">Unavailable</span>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="text-white/60 text-sm mb-1">Database</p>
              <div className="flex items-center gap-2">
                {statusData?.status?.database === "operational" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                )}
                <span className="text-white font-medium capitalize">
                  {statusData?.status?.database || "unknown"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Uptime</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-white font-medium">
                  {statusData?.status?.uptime
                    ? formatUptime(statusData.status.uptime)
                    : "N/A"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Last Updated</p>
              <span className="text-white font-medium text-sm">
                {statusData?.status?.timestamp
                  ? new Date(statusData.status.timestamp).toLocaleTimeString()
                  : "N/A"}
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
          <div className="space-y-2">
            {statusData?.endpoints?.map((endpoint) => (
              <div
                key={endpoint.endpoint}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm sm:text-base text-white font-medium">
                      {endpoint.name}
                    </h3>
                    {getStatusBadge(endpoint.status)}
                  </div>
                  <p className="text-white/60 text-xs sm:text-sm font-mono break-all">
                    {endpoint.endpoint}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-white/60 text-xs mb-1">Response Time</p>
                  <p className="text-sm sm:text-base text-white font-medium">
                    {endpoint.responseTime}ms
                  </p>
                </div>
              </div>
            )) || (showInlinePending ? <div className="h-16 rounded-lg border border-white/10 bg-white/5" aria-label="Loading endpoint status" /> : <p className="text-sm text-white/50">Endpoint status is unavailable.</p>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
