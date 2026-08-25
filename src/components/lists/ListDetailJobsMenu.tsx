"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, MoreVertical, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const anyBusy =
    busy || isSettingUpSchedule || isRefreshingMetadata || isCheckingHealth;
  const refreshDisabled = busy || !hasUrls || isRefreshingMetadata;
  const healthDisabled = busy || !hasUrls || isCheckingHealth;
  const scheduleDisabled = busy || isSettingUpSchedule;

  return (
    <div className="relative shrink-0" ref={open ? menuRef : undefined}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10"
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
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[100] mt-1.5 w-56 origin-top-right rounded-xl border border-white/20 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-1 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
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
        </div>
      )}
    </div>
  );
}
