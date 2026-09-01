import { Badge } from "@/components/ui/Badge";
import { UI_SECTION_COUNT_BADGE } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

export type SectionCountBadgeProps = {
  count: number;
  loading?: boolean;
  className?: string;
};

/** Pill count badge for section headers (Collaborators, Activity, tabs, etc.). */
export function SectionCountBadge({
  count,
  loading = false,
  className,
}: SectionCountBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(UI_SECTION_COUNT_BADGE, className)}
    >
      {loading ? "…" : count}
    </Badge>
  );
}
