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
import { UI_ICON_CONTROL, UI_ICON_MENU_TRIGGER } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

export type ListDetailJobsMenuProps = {
  /** Soft-nav / busy: show trigger only; all actions disabled. */
  busy?: boolean;
  /**
   * Owner/editor can run jobs. Viewers see the same menu chrome with
   * Setup/Refresh/Health disabled (Cancel stays active) — avoids 401 toasts.
   */
  canRunJobs?: boolean;
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
  canRunJobs = true,
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
  const refreshDisabled =
    busy || !canRunJobs || !hasUrls || isRefreshingMetadata;
  const healthDisabled = busy || !canRunJobs || !hasUrls || isCheckingHealth;
  const scheduleDisabled = busy || !canRunJobs || isSettingUpSchedule;

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
                UI_ICON_CONTROL,
                anyBusy && !busy ? "animate-pulse" : undefined,
              )}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            disabled={scheduleDisabled}
            onSelect={() => {
              if (!canRunJobs) return;
              void onSetupSchedule?.();
            }}
            className="cursor-pointer"
          >
            <Activity
              className={cn(
                UI_ICON_CONTROL,
                "text-violet-300",
                isSettingUpSchedule && "animate-spin",
              )}
            />
            {isSettingUpSchedule ? "Setting up…" : "Setup Schedule"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={refreshDisabled}
            onSelect={() => {
              if (!canRunJobs) return;
              void onRefreshMetadata?.();
            }}
            className="cursor-pointer"
          >
            <RefreshCw
              className={cn(
                UI_ICON_CONTROL,
                "text-emerald-300",
                isRefreshingMetadata && "animate-spin",
              )}
            />
            {isRefreshingMetadata ? "Refreshing…" : "Refresh Metadata"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={healthDisabled}
            onSelect={() => {
              if (!canRunJobs) return;
              void onHealthCheck?.();
            }}
            className="cursor-pointer"
          >
            <Activity
              className={cn(
                UI_ICON_CONTROL,
                "text-blue-300",
                isCheckingHealth && "animate-spin",
              )}
            />
            {isCheckingHealth ? "Checking…" : "Health Check"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-white/70">
            <X className={UI_ICON_CONTROL} />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
