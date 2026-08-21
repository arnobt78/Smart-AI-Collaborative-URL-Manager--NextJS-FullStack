import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { HEADING_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional right-side control (e.g. refresh) — justify-between with title block. */
  action?: ReactNode;
  className?: string;
}

/**
 * C7.0: Shared page identity — title/subtitle match My Lists gradient contract.
 * C7.6: optional `action` slot for header-row controls.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start gap-3",
        action && "justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 shadow-[0_0_24px_rgba(96,165,250,0.18)]">
          <Icon className="h-5 w-5 text-blue-300" aria-hidden />
        </span>
        <div className={cn(HEADING_STACK, "min-w-0")}>
          <h1 className="text-lg sm:text-xl font-medium bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent leading-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-white/70 leading-snug">
            {description}
          </p>
        </div>
      </div>
      {action ? (
        <div className="shrink-0 pt-0.5 sm:pt-1">{action}</div>
      ) : null}
    </header>
  );
}
