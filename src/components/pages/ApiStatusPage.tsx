"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react";
import { useApiStatusQuery } from "@/hooks/useBrowseQueries";
import { cn } from "@/lib/utils";
import { PAGE_STACK, CARD_PAD } from "@/lib/ui-spacing";
import { PageHeader } from "@/components/ui/PageHeader";

/** Same four endpoints the status API reports — chrome rows before live data. */
const STATUS_ENDPOINT_SHELLS = [
  { name: "Lists API", endpoint: "/api/lists" },
  { name: "Metadata API", endpoint: "/api/metadata" },
  {
    name: "Business Insights API",
    endpoint: "/api/business-insights/overview",
  },
  { name: "Auth API", endpoint: "/api/auth/session" },
] as const;

/** C7.4: Size-matched pulse bar for badges / text values. */
function ValuePulse({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block animate-pulse rounded-md bg-white/10", className)}
      aria-hidden
    />
  );
}

export default function ApiStatusPage() {
  // Client owns the probe (RSC no longer awaits status). Poll every 30s.
  const { data: statusData } = useApiStatusQuery();
  // Immediate pending when cold — do not delay (avoids unknown/N/A flash)
  const valuesPending = !statusData;

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

  const endpoints =
    statusData?.endpoints ??
    STATUS_ENDPOINT_SHELLS.map((row) => ({
      ...row,
      status: "",
      responseTime: 0,
    }));

  return (
    <div className={cn("w-full", PAGE_STACK)}>
      <PageHeader
        icon={Activity}
        title="API Status"
        description="Real-time monitoring of all API endpoints"
      />

      {/* Chrome-first: labels always on; only live values pulse */}
      <Card className={CARD_PAD}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <CardTitle className="text-base sm:text-lg">System Status</CardTitle>
            {statusData?.status ? (
              getStatusBadge(statusData.status.overall)
            ) : (
              <span aria-label="Loading status">
                <ValuePulse className="h-5 w-[6.5rem]" />
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="text-white/60 text-sm mb-1">Database</p>
              <div className="flex items-center gap-2 min-h-5">
                {valuesPending ? (
                  <>
                    <ValuePulse className="h-4 w-4 rounded-full" />
                    <ValuePulse className="h-4 w-20" />
                  </>
                ) : (
                  <>
                    {statusData?.status?.database === "operational" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                    )}
                    <span className="text-white font-medium capitalize">
                      {statusData?.status?.database || "unknown"}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Uptime</p>
              <div className="flex items-center gap-2 min-h-5">
                <Clock className="h-4 w-4 text-blue-400 shrink-0" />
                {valuesPending ? (
                  <ValuePulse className="h-4 w-16" />
                ) : (
                  <span className="text-white font-medium">
                    {statusData?.status?.uptime != null
                      ? formatUptime(statusData.status.uptime)
                      : "N/A"}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Last Updated</p>
              <div className="min-h-5 flex items-center">
                {valuesPending ? (
                  <ValuePulse className="h-4 w-24" />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {statusData?.status?.timestamp
                      ? new Date(statusData.status.timestamp).toLocaleTimeString()
                      : "N/A"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={CARD_PAD}>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.endpoint}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-2 sm:p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-2 mb-1 flex-wrap min-h-6">
                    <h3 className="text-sm sm:text-base text-white font-medium">
                      {endpoint.name}
                    </h3>
                    {valuesPending || !endpoint.status ? (
                      <ValuePulse className="h-5 w-[6.5rem]" />
                    ) : (
                      getStatusBadge(endpoint.status)
                    )}
                  </div>
                  <p className="text-white/60 text-xs sm:text-sm font-mono break-all">
                    {endpoint.endpoint}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-white/60 text-xs mb-1">Response Time</p>
                  {valuesPending || !statusData?.endpoints ? (
                    <ValuePulse className="h-5 w-14" />
                  ) : (
                    <p className="text-sm sm:text-base text-white font-medium">
                      {endpoint.responseTime}ms
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
