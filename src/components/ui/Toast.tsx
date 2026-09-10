"use client";

import React, { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
  /** When true, shows a spinner and skips auto-dismiss until cleared. */
  loading?: boolean;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastStatusIcon({
  variant,
  loading,
}: {
  variant: Toast["variant"];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Loader2
        className={cn(UI_ICON_CONTROL, "animate-spin")}
        aria-hidden
      />
    );
  }

  switch (variant) {
    case "success":
      return <CheckCircle2 className={UI_ICON_CONTROL} aria-hidden />;
    case "error":
      return <XCircle className={UI_ICON_CONTROL} aria-hidden />;
    case "warning":
      return <AlertTriangle className={UI_ICON_CONTROL} aria-hidden />;
    case "info":
      return <Info className={UI_ICON_CONTROL} aria-hidden />;
    default:
      return <Info className={UI_ICON_CONTROL} aria-hidden />;
  }
}

export function ToastComponent({ toast, onClose }: ToastProps) {
  const duration = toast.duration ?? 5000;
  const isPersistent = duration === 0 || toast.loading;

  useEffect(() => {
    if (isPersistent) return;

    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, isPersistent, onClose]);

  const variantStyles = {
    default:
      "border-white/25 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 text-white backdrop-blur-md",
    success:
      "border-green-500/40 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 text-green-50 backdrop-blur-md",
    error:
      "border-red-500/40 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 text-red-50 backdrop-blur-md",
    warning:
      "border-yellow-500/40 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 text-yellow-50 backdrop-blur-md",
    info:
      "border-blue-500/40 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 text-blue-50 backdrop-blur-md",
  };

  const iconStyles = {
    default: "text-white/80",
    success: "text-green-300",
    error: "text-red-300",
    warning: "text-yellow-300",
    info: "text-blue-300",
  };

  const variant = toast.variant || "default";

  return (
    <div
      role="status"
      aria-busy={toast.loading || undefined}
      className={cn(
        "toast-slide-in group relative w-full max-w-md rounded-xl border p-4 shadow-2xl",
        // Opaque glass like menus — /20 tints were unreadable over cards
        variantStyles[variant],
      )}
    >
      <button
        onClick={() => onClose(toast.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
        aria-label="Close"
      >
        <X className={UI_ICON_CONTROL} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className={cn("mt-0.5", iconStyles[variant])}>
          <ToastStatusIcon variant={variant} loading={toast.loading} />
        </div>
        <div className="min-w-0 flex-1">
          {toast.title ? (
            <div className="font-medium text-sm mb-1">{toast.title}</div>
          ) : null}
          <div className="text-sm">{toast.description}</div>
        </div>
      </div>
    </div>
  );
}
