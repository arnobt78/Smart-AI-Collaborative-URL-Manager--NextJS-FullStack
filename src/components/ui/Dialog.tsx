"use client";

import { useEffect, useId, useRef } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogSize = "form" | "wide" | "full";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: DialogSize;
  pending?: boolean;
  className?: string;
}

const sizeClasses: Record<DialogSize, string> = {
  form: "max-w-2xl",
  wide: "max-w-5xl",
  full: "max-w-7xl",
};

/**
 * Shared accessible application dialog. Content remains mounted only while open
 * so feature queries start on demand, while cached React Query data is retained.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "form",
  pending = false,
  className,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const requestClose = () => {
    if (!pending) onOpenChange(false);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") requestClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative flex max-h-[85dvh] w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-zinc-900 to-zinc-800 shadow-2xl overscroll-contain",
          sizeClasses[size],
          className,
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-medium leading-tight text-white sm:text-2xl">
              {title}
            </h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm text-white/60 sm:text-base">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={pending}
            aria-label="Close dialog"
            className="shrink-0 rounded-md p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
