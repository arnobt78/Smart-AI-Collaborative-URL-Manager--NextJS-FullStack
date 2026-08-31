"use client";

import { Activity, MoreVertical, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UI_ICON_MENU_TRIGGER } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

export type ListDetailJobsMenuProps = {
  /** Soft-nav / busy: show trigger only; all actions disabled. */
  busy?: boolean;
  hasUrls: boolean;
  isSettingUpSchedule?: boolean;
  isRefreshingMetadata?: boolean;
  isCheckingHealth?: boolean;
  onSetupSchedule?: () => void | Promise<void>;
  onRefreshMetadata?: () => void | Promise<void>;
  onHealthCheck?: () => void | Promise<void>;
};

/**
 * Stable header … menu for list-detail jobs (Setup Schedule / Refresh / Health).
 * Always mounts the trigger so soft-nav → hydrate does not reflow the action row.
 * Radix portal paints above Collaborators / later cards; modal={false} keeps sticky nav scrollable.
 */
export function ListDetailJobsMenu({
  busy = false,
  hasUrls,
  isSettingUpSchedule = false,
  isRefreshingMetadata = false,
  isCheckingHealth = false,
  onSetupSchedule,
  onRefreshMetadata,
  onHealthCheck,
}: ListDetailJobsMenuProps) {
  const anyBusy =
    busy || isSettingUpSchedule || isRefreshingMetadata || isCheckingHealth;
  const refreshDisabled = busy || !hasUrls || isRefreshingMetadata;
  const healthDisabled = busy || !hasUrls || isCheckingHealth;
  const scheduleDisabled = busy || isSettingUpSchedule;

  return (
    <div className="relative shrink-0">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={UI_ICON_MENU_TRIGGER}
            aria-label="List jobs menu"
            title="List jobs"
          >
            <MoreVertical
              className={cn(
                "h-4 w-4",
                anyBusy && !busy ? "animate-pulse" : undefined,
              )}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            disabled={scheduleDisabled}
            onSelect={() => {
              void onSetupSchedule?.();
            }}
            className="cursor-pointer"
          >
            <Activity
              className={cn(
                "h-4 w-4 text-violet-300",
                isSettingUpSchedule && "animate-spin",
              )}
            />
            {isSettingUpSchedule ? "Setting up…" : "Setup Schedule"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={refreshDisabled}
            onSelect={() => {
              void onRefreshMetadata?.();
            }}
            className="cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-emerald-300",
                isRefreshingMetadata && "animate-spin",
              )}
            />
            {isRefreshingMetadata ? "Refreshing…" : "Refresh Metadata"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={healthDisabled}
            onSelect={() => {
              void onHealthCheck?.();
            }}
            className="cursor-pointer"
          >
            <Activity
              className={cn(
                "h-4 w-4 text-blue-300",
                isCheckingHealth && "animate-spin",
              )}
            />
            {isCheckingHealth ? "Checking…" : "Health Check"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-white/70">
            <X className="h-4 w-4" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
