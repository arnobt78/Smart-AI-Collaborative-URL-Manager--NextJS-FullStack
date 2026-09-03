"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CircleCheck,
  CircleHelp,
  CircleX,
} from "lucide-react";
import type { HealthStatus } from "@/lib/jobs/url-health";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

interface UrlHealthIndicatorProps {
  status?: HealthStatus;
  httpStatus?: number;
  responseTime?: number;
  checkedAt?: string;
  showDetails?: boolean;
  variant?: "chip" | "inline";
}

type StatusConfig = {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
};

export function UrlHealthIndicator({
  status = "unknown",
  httpStatus,
  responseTime,
  checkedAt,
  showDetails = false,
  variant = "chip",
}: UrlHealthIndicatorProps) {
  const getStatusConfig = (): StatusConfig => {
    switch (status) {
      case "healthy":
        return {
          icon: CircleCheck,
          color: "text-green-400",
          bgColor: "bg-green-500/15",
          borderColor: "border-green-400/40",
          label: "Healthy",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          color: "text-amber-400",
          bgColor: "bg-amber-500/15",
          borderColor: "border-amber-400/40",
          label: "Warning",
        };
      case "broken":
        return {
          icon: CircleX,
          color: "text-red-400",
          bgColor: "bg-red-500/15",
          borderColor: "border-red-400/40",
          label: "Broken",
        };
      default:
        return {
          icon: CircleHelp,
          color: "text-white/50",
          bgColor: "bg-white/10",
          borderColor: "border-white/25",
          label: "Unknown",
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

  const buildTooltipMessage = () => {
    const parts: string[] = [`Status: ${config.label}`];

    if (httpStatus) parts.push(`HTTP ${httpStatus}`);
    if (responseTime) parts.push(`${responseTime}ms`);

    if (checkedAt) {
      const checkedTime = formatCheckedAt(checkedAt);
      if (checkedTime) parts.push(`Checked: ${checkedTime}`);
    }

    return parts.join(" • ");
  };

  const isInline = variant === "inline";

  return (
    <HoverTooltip
      message={buildTooltipMessage()}
      position="top"
      usePortal={true}
    >
      <span
        className={cn(
          "inline-flex shrink-0 cursor-help align-middle",
          isInline
            ? cn(
                "h-5 min-w-5 items-center justify-center rounded-full border px-1",
                config.bgColor,
                config.borderColor,
              )
            : cn(
                "items-center gap-1 rounded-md border px-2 py-1 transition-colors",
                config.bgColor,
                config.borderColor,
              ),
        )}
      >
        <Icon
          className={cn(UI_ICON_CONTROL, config.color)}
          strokeWidth={2.25}
          aria-hidden
        />
        {!isInline && showDetails && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
        {!isInline && showDetails && httpStatus && (
          <span className="text-xs text-gray-400">({httpStatus})</span>
        )}
        {!isInline && showDetails && responseTime && (
          <span className="text-xs text-gray-400">{responseTime}ms</span>
        )}
        {!isInline && showDetails && checkedAt && (
          <span className="text-xs text-gray-500">
            • {formatCheckedAt(checkedAt)}
          </span>
        )}
      </span>
    </HoverTooltip>
  );
}
