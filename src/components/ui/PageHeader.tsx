import type { LucideIcon } from "lucide-react";
import { HEADING_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

/** Shared page identity row; pages own only their copy and meaningful icon. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex items-center gap-3", className)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 shadow-[0_0_24px_rgba(96,165,250,0.18)]">
        <Icon className="h-5 w-5 text-blue-300" aria-hidden />
      </span>
      <div className={cn(HEADING_STACK, "min-w-0")}>
        <h1 className="text-2xl font-medium leading-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm leading-snug text-white/60 sm:text-base">
          {description}
        </p>
      </div>
    </header>
  );
}
