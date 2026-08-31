"use client";

import { useRef, useState } from "react";
import { Activity, MoreVertical, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassPortalMenu } from "@/components/ui/GlassPortalMenu";
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
 * Panel is body-portaled so it paints above Collaborators / later cards.
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
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const anyBusy =
    busy || isSettingUpSchedule || isRefreshingMetadata || isCheckingHealth;
  const refreshDisabled = busy || !hasUrls || isRefreshingMetadata;
  const healthDisabled = busy || !hasUrls || isCheckingHealth;
  const scheduleDisabled = busy || isSettingUpSchedule;

  return (
    <div className="relative shrink-0">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className={UI_ICON_MENU_TRIGGER}
        aria-expanded={open}
        aria-haspopup="menu"
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
      <GlassPortalMenu
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        widthClassName="w-56"
      >
        <button
          type="button"
          role="menuitem"
          disabled={scheduleDisabled}
          onClick={() => {
            if (scheduleDisabled) return;
            setOpen(false);
            void onSetupSchedule?.();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            scheduleDisabled
              ? "text-white/40 cursor-not-allowed"
              : "text-white/90 hover:bg-white/10",
          )}
        >
          <Activity
            className={cn(
              "h-4 w-4 text-violet-300",
              isSettingUpSchedule && "animate-spin",
            )}
          />
          {isSettingUpSchedule ? "Setting up…" : "Setup Schedule"}
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={refreshDisabled}
          onClick={() => {
            if (refreshDisabled) return;
            setOpen(false);
            void onRefreshMetadata?.();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            refreshDisabled
              ? "text-white/40 cursor-not-allowed"
              : "text-white/90 hover:bg-white/10",
          )}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 text-emerald-300",
              isRefreshingMetadata && "animate-spin",
            )}
          />
          {isRefreshingMetadata ? "Refreshing…" : "Refresh Metadata"}
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={healthDisabled}
          onClick={() => {
            if (healthDisabled) return;
            setOpen(false);
            void onHealthCheck?.();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            healthDisabled
              ? "text-white/40 cursor-not-allowed"
              : "text-white/90 hover:bg-white/10",
          )}
        >
          <Activity
            className={cn(
              "h-4 w-4 text-blue-300",
              isCheckingHealth && "animate-spin",
            )}
          />
          {isCheckingHealth ? "Checking…" : "Health Check"}
        </button>
        <div className="my-1 h-px bg-white/10" />
        <button
          type="button"
          role="menuitem"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </GlassPortalMenu>
    </div>
  );
}
