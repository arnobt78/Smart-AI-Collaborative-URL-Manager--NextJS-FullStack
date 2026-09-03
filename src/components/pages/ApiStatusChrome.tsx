"use client";

/**
 * C7.5: Shared api-status chrome — used by page + loading.tsx so soft-nav
 * paints the same header/cards/labels instantly (no center DataSurfaceSlot).
 * C7.6: header refresh control (spinner + refreshing… while fetching).
 */

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_STACK, CARD_PAD } from "@/lib/ui-spacing";
import { PageHeader } from "@/components/ui/PageHeader";
import { GLASS_GHOST_BUTTON, GLASS_BUTTON_ICON_HOVER } from "@/lib/ui/glass-button-styles";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";

export const STATUS_ENDPOINT_SHELLS = [
  { name: "Lists API", endpoint: "/api/lists" },
  { name: "Metadata API", endpoint: "/api/metadata" },
  {
    name: "Business Insights API",
    endpoint: "/api/business-insights/overview",
  },
  { name: "Auth API", endpoint: "/api/auth/session" },
] as const;

export type ApiStatusChromeData = {
  status?: {
    overall: string;
    database: string;
    uptime: number;
    timestamp: string;
  };
  endpoints?: Array<{
    name: string;
    endpoint: string;
    status: string;
    responseTime: number;
  }>;
};

/** Size-matched pulse bar for badges / text values. */
export function ValuePulse({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block animate-pulse rounded-md bg-white/10", className)}
      aria-hidden
    />
  );
}

function formatUptime(seconds: number) {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function getStatusBadge(status: string) {
  if (status === "operational") {
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle2 className={UI_ICON_CONTROL} />
        Operational
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="flex items-center gap-1">
      <AlertCircle className={UI_ICON_CONTROL} />
      Degraded
    </Badge>
  );
}

type ApiStatusRefreshControlProps = {
  isFetching: boolean;
  onRefresh?: () => void;
  /** Soft-nav / loading.tsx: non-interactive busy affordance. */
  staticBusy?: boolean;
};

/**
 * C7.6: Idle Refresh icon; while fetching → spinner + “refreshing…”.
 */
export function ApiStatusRefreshControl({
  isFetching,
  onRefresh,
  staticBusy = false,
}: ApiStatusRefreshControlProps) {
  const busy = staticBusy || isFetching;
  const className = cn(
    GLASS_GHOST_BUTTON,
    !busy && GLASS_BUTTON_ICON_HOVER,
    "group px-3 text-sm",
  );

  if (staticBusy || !onRefresh) {
    return (
      <span
        className={className}
        aria-busy="true"
        aria-live="polite"
        role="status"
      >
        <Loader2 className={cn(UI_ICON_CONTROL, "animate-spin")} aria-hidden />
        <span>refreshing…</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onRefresh()}
      disabled={busy}
      aria-busy={busy}
      aria-label={busy ? "Refreshing status" : "Refresh status"}
    >
      {busy ? (
        <>
          <Loader2 className={cn(UI_ICON_CONTROL, "animate-spin")} aria-hidden />
          <span>refreshing…</span>
        </>
      ) : (
        <>
          <RefreshCw className={UI_ICON_CONTROL} aria-hidden />
          <span className="hidden sm:inline">Refresh</span>
        </>
      )}
    </button>
  );
}

type ApiStatusChromeProps = {
  /** When true (or no data), pulse only live value slots. */
  valuesPending?: boolean;
  data?: ApiStatusChromeData | null;
  /** Header right action (refresh control). */
  headerAction?: ReactNode;
};

/**
 * Full page chrome: header + cards + static labels/endpoint rows.
 * Live badges/times fill when `data` is present and valuesPending is false.
 */
export function ApiStatusChrome({
  valuesPending = true,
  data = null,
  headerAction,
}: ApiStatusChromeProps) {
  const pending = valuesPending || !data;
  const endpoints =
    data?.endpoints ??
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
        action={headerAction}
      />

      <Card className={CARD_PAD}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <CardTitle className="text-base sm:text-lg">System Status</CardTitle>
            {data?.status && !pending ? (
              getStatusBadge(data.status.overall)
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
                {pending || !data?.status ? (
                  <>
                    <ValuePulse className="h-4 w-4 rounded-full" />
                    <ValuePulse className="h-4 w-20" />
                  </>
                ) : (
                  <>
                    {data.status.database === "operational" ? (
                      <CheckCircle2
                        className={cn(UI_ICON_CONTROL, "text-green-400")}
                      />
                    ) : (
                      <AlertCircle
                        className={cn(UI_ICON_CONTROL, "text-yellow-400")}
                      />
                    )}
                    <span className="text-white font-medium capitalize">
                      {data.status.database || "unknown"}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Uptime</p>
              <div className="flex items-center gap-2 min-h-5">
                <Clock className={cn(UI_ICON_CONTROL, "text-blue-400")} />
                {pending || !data?.status ? (
                  <ValuePulse className="h-4 w-16" />
                ) : (
                  <span className="text-white font-medium">
                    {data.status.uptime != null
                      ? formatUptime(data.status.uptime)
                      : "N/A"}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1">Last Updated</p>
              <div className="min-h-5 flex items-center">
                {pending || !data?.status ? (
                  <ValuePulse className="h-4 w-24" />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {data.status.timestamp
                      ? new Date(data.status.timestamp).toLocaleTimeString()
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
                    {pending || !endpoint.status ? (
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
                  {pending || !data?.endpoints ? (
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
