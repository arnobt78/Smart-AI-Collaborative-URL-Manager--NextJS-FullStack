import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { IdentityHeading } from "@/components/ui/IdentityHeading";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional right-side control (e.g. refresh) — justify-between with title block. */
  action?: ReactNode;
  /** Optional accessory beside the title (e.g. SectionCountBadge). */
  titleAccessory?: ReactNode;
  className?: string;
}

/**
 * C7.0: Shared page identity — Stockly tile + title/subtitle.
 * C7.6: optional `action` slot for header-row controls.
 */
export function PageHeader({
  icon,
  title,
  description,
  action,
  titleAccessory,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(className)}>
      <IdentityHeading
        icon={icon}
        title={title}
        subtitle={description}
        action={action}
        titleAccessory={titleAccessory}
        titleAs="h1"
      />
    </header>
  );
}
