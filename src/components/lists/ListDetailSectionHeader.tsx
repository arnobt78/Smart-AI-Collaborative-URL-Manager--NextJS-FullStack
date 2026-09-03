"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
import { HEADING_STACK } from "@/lib/ui-spacing";
import {
  UI_IDENTITY_GAP,
  type UIIconTileHue,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

export type ListDetailSectionHeaderProps = {
  icon: LucideIcon;
  hue?: UIIconTileHue;
  title: string;
  badge?: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
};

const titleClassName = "text-sm font-medium text-white sm:text-base";
const subtitleClassName = "text-xs text-white/60 break-words sm:text-sm";

/** Smart-Collections-style section header: GlassIconTile left, title+badge / subtitle, optional action. */
export function ListDetailSectionHeader({
  icon,
  hue = "blue",
  title,
  badge,
  subtitle,
  action,
  collapsible = false,
  expanded = false,
  onToggle,
  className,
}: ListDetailSectionHeaderProps) {
  const titleId = useId();
  const subtitleId = useId();

  const textBlock = collapsible ? (
    <div className={cn(HEADING_STACK, "min-w-0")}>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span id={titleId} className={titleClassName}>
          {title}
        </span>
        {badge}
      </div>
      {subtitle ? (
        <span id={subtitleId} className={subtitleClassName}>
          {subtitle}
        </span>
      ) : null}
    </div>
  ) : (
    <div className={cn(HEADING_STACK, "min-w-0")}>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <h3 className={titleClassName}>{title}</h3>
        {badge}
      </div>
      {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
    </div>
  );

  const content = (
    <>
      <div className={cn("flex min-w-0 flex-1 items-center", UI_IDENTITY_GAP)}>
        <GlassIconTile icon={icon} hue={hue} />
        {textBlock}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </>
  );

  if (collapsible && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-labelledby={subtitle ? `${titleId} ${subtitleId}` : titleId}
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 text-left sm:gap-3",
          "transition-colors hover:bg-white/10",
          expanded
            ? "rounded-t-xl sm:rounded-t-2xl rounded-b-none"
            : "rounded-xl sm:rounded-2xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3",
        className,
      )}
    >
      {content}
    </div>
  );
}
