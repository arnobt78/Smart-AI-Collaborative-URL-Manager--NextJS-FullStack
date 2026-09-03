// REQ-0021: Shared dialog supports fixed or scrollable header chrome without duplicate form headings.
"use client";

import { useEffect, useId, useRef } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { HEADING_STACK } from "@/lib/ui-spacing";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type DialogSize = "form" | "wide" | "full";
type DialogHeaderMode = "fixed" | "scroll";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: DialogSize;
  pending?: boolean;
  className?: string;
  headerMode?: DialogHeaderMode;
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
  headerMode = "fixed",
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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-md p-2 sm:p-4"
      style={{ opacity: open ? 1 : 0 }}
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
        {headerMode === "fixed" ? (
          <DialogHeader
            title={title}
            description={description}
            titleId={titleId}
            descriptionId={descriptionId}
            pending={pending}
            onClose={requestClose}
            className="shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-4"
          />
        ) : null}
        <div className="dialog-scrollbar min-h-0 overflow-y-auto p-4 sm:p-6">
          {headerMode === "scroll" ? (
            <DialogHeader
              title={title}
              description={description}
              titleId={titleId}
              descriptionId={descriptionId}
              pending={pending}
              onClose={requestClose}
              className="pb-2 sm:pb-4"
            />
          ) : null}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface DialogHeaderProps {
  title: string;
  description?: string;
  titleId: string;
  descriptionId: string;
  pending: boolean;
  onClose: () => void;
  className: string;
}

function DialogHeader({
  title,
  description,
  titleId,
  descriptionId,
  pending,
  onClose,
  className,
}: DialogHeaderProps) {
  return (
    <header
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <div className={cn(HEADING_STACK, "min-w-0")}>
        <h2
          id={titleId}
          className="text-lg font-medium leading-tight text-white sm:text-xl"
        >
          {title}
        </h2>
        {description ? (
          <p
            id={descriptionId}
            className="text-xs leading-snug text-white/60 sm:text-sm"
          >
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        aria-label="Close dialog"
        className="shrink-0 rounded-md p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X className={UI_ICON_CONTROL} aria-hidden />
      </button>
    </header>
  );
}
