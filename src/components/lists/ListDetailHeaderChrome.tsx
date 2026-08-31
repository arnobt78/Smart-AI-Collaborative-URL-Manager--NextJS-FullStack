"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { AlignLeft, ArrowLeft, Blocks, Globe2, GlobeLock } from "lucide-react";
import { CARD_PAD, CARD_STACK, LIST_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";


export type ListDetailHeaderList = {
  slug: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  urls?: unknown[] | null;
};

export type ListDetailHeaderChromeProps = {
  list: ListDetailHeaderList;
  /** When true, Switch/actions are non-interactive shells (optimistic soft-nav). */
  busy?: boolean;
  canInvite?: boolean;
  visibilityPending?: boolean;
  onVisibilityChange?: (isPublic: boolean) => void;
  /** Navigate back to Lists (stable). Soft-nav may omit or pass live handler. */
  onBack?: () => void;
  actions?: ReactNode;
  shareRow?: ReactNode;
  className?: string;
};

const badgeTextClass = "text-xs text-center justify-center";

/**
 * Shared list-detail header chrome for ListPage + OptimisticSoftNavSurface (C7.9 / C7.10).
 */
export function ListDetailHeaderChrome({
  list,
  busy = false,
  canInvite = false,
  visibilityPending = false,
  onVisibilityChange,
  onBack,
  actions,
  shareRow,
  className,
}: ListDetailHeaderChromeProps) {
  const urlCount = Array.isArray(list.urls) ? list.urls.length : 0;
  const isPublic = list.isPublic ?? false;

  return (
    <div
      className={cn(
        "bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-xl",
        CARD_PAD,
        className,
      )}
    >
      <div className={cn(CARD_STACK, "min-w-0")}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            <Blocks className="h-5 w-5 text-blue-300 shrink-0" aria-hidden />
            <h1 className="text-base sm:text-lg xl:text-xl font-medium text-white break-words">
              {list.title || `List: ${list.slug}`}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onBack ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Back</span>
              </Button>
            ) : null}
            {actions}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className={cn(badgeTextClass, "inline-flex items-center w-fit")}
          >
            {urlCount} {urlCount === 1 ? "URL" : "URLs"}
          </Badge>
          <Badge
            variant={isPublic ? "success" : "secondary"}
            className={cn(
              badgeTextClass,
              "inline-flex items-center gap-1 w-fit",
            )}
          >
            {isPublic ? (
              <>
                <Globe2 className="w-3 h-3 shrink-0" aria-hidden />
                <span className="hidden sm:inline">
                  Public - Anyone can view
                </span>
                <span className="sm:hidden">Public</span>
              </>
            ) : (
              <>
                <GlobeLock className="w-3 h-3 shrink-0" aria-hidden />
                <span className="hidden sm:inline">
                  Private - Only you & collaborators
                </span>
                <span className="sm:hidden">Private</span>
              </>
            )}
          </Badge>
          <div className="flex items-center gap-1">
            <Switch
              checked={isPublic}
              disabled={busy || visibilityPending || !canInvite}
              onChange={(e) => {
                if (busy || !onVisibilityChange) return;
                onVisibilityChange(e.target.checked);
              }}
            />
            <span className="text-[10px] text-white/50 hidden sm:inline">
              {isPublic ? "Public" : "Private"}
            </span>
          </div>
        </div>

        {list.description ? (
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <AlignLeft
              className="h-4 w-4 shrink-0 text-white/50"
              aria-hidden
            />
            <p className="text-xs sm:text-sm text-white/60 line-clamp-2 min-w-0">
              {list.description}
            </p>
          </div>
        ) : null}

        {shareRow}
      </div>
    </div>
  );
}

/** Skeletons for Collaborators / SC / Activity while thin soft-nav awaits hydrate (UrlList paints live). */
export function ListDetailBodySkeletons() {
  return (
    <div className={LIST_STACK} aria-hidden>
      <div
        className={cn(
          "bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl animate-pulse",
          CARD_PAD,
        )}
      >
        <div className="h-4 w-32 rounded bg-white/10 mb-3" />
        <div className="space-y-2">
          <div className="h-12 rounded-lg bg-white/5 border border-white/10" />
          <div className="h-12 rounded-lg bg-white/5 border border-white/10" />
        </div>
      </div>
      <div
        className={cn(
          "bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl animate-pulse",
          CARD_PAD,
        )}
      >
        <div className="h-4 w-40 rounded bg-white/10 mb-3" />
        <div className="h-16 rounded-lg bg-white/5" />
      </div>
      <div
        className={cn(
          "bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl animate-pulse h-10",
          CARD_PAD,
        )}
      />
    </div>
  );
}
