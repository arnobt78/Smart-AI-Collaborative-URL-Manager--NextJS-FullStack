"use client";

import type { HealthStatus } from "@/lib/jobs/url-health";
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { HoverTooltip } from "@/components/ui/HoverTooltip";

interface UrlHealthIndicatorProps {
  status?: HealthStatus;
  httpStatus?: number;
  responseTime?: number;
  checkedAt?: string;
  showDetails?: boolean;
}

export function UrlHealthIndicator({
  status = "unknown",
  httpStatus,
  responseTime,
  checkedAt,
  showDetails = false,
}: UrlHealthIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "healthy":
        return {
          icon: CheckCircleIcon,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          label: "Healthy",
          tooltip: `URL is working properly${httpStatus ? ` (${httpStatus})` : ""}${responseTime ? ` - ${responseTime}ms` : ""}`,
        };
      case "warning":
        return {
          icon: ExclamationTriangleIcon,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          label: "Warning",
          tooltip: `URL has issues${httpStatus ? ` (${httpStatus})` : ""}${responseTime ? ` - ${responseTime}ms` : ""}`,
        };
      case "broken":
        return {
          icon: XCircleIcon,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          label: "Broken",
          tooltip: `URL is not accessible${httpStatus ? ` (${httpStatus})` : ""}`,
        };
      default:
        return {
          icon: QuestionMarkCircleIcon,
          color: "text-gray-400",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/20",
          label: "Unknown",
          tooltip: "Health status not checked yet",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatCheckedAt = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return null;
    }
  };

  // Build detailed tooltip message
  const buildTooltipMessage = () => {
    const parts: string[] = [];
    
    // Status label
    parts.push(`Status: ${config.label}`);
    
    // HTTP status code
    if (httpStatus) {
      parts.push(`HTTP ${httpStatus}`);
    }
    
    // Response time
    if (responseTime) {
      parts.push(`${responseTime}ms`);
    }
    
    // Last checked
    if (checkedAt) {
      const checkedTime = formatCheckedAt(checkedAt);
      if (checkedTime) {
        parts.push(`Checked: ${checkedTime}`);
      }
    }
    
    return parts.join(" • ");
  };

  return (
    <HoverTooltip message={buildTooltipMessage()} position="top" usePortal={true}>
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor} ${config.borderColor} border transition-colors cursor-help`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
        {showDetails && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
        {showDetails && httpStatus && (
          <span className="text-xs text-gray-400">({httpStatus})</span>
        )}
        {showDetails && responseTime && (
          <span className="text-xs text-gray-400">{responseTime}ms</span>
        )}
        {showDetails && checkedAt && (
          <span className="text-xs text-gray-500">
            • {formatCheckedAt(checkedAt)}
          </span>
        )}
      </div>
    </HoverTooltip>
  );
}

