/**
 * Leading GlassIconTile + title/subtitle stack, vertically centered (Stockly identity row).
 */
import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
import { HEADING_STACK } from "@/lib/ui-spacing";
import {
  UI_IDENTITY_GAP,
  type UIIconTileHue,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type AnyIcon =
  | LucideIcon
  | ComponentType<SVGProps<SVGSVGElement> & { className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

type IdentityHeadingProps = {
  icon: AnyIcon;
  title: string;
  subtitle?: string;
  hue?: UIIconTileHue;
  action?: ReactNode;
  className?: string;
  /** Use h1 for page chrome; h2/h3 for section cards. */
  titleAs?: "h1" | "h2" | "h3";
  titleClassName?: string;
  subtitleClassName?: string;
};

export function IdentityHeading({
  icon,
  title,
  subtitle,
  hue = "blue",
  action,
  className,
  titleAs: TitleTag = "h1",
  titleClassName,
  subtitleClassName,
}: IdentityHeadingProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        UI_IDENTITY_GAP,
        action && "justify-between",
        className,
      )}
    >
      <div className={cn("flex min-w-0 flex-1 items-center", UI_IDENTITY_GAP)}>
        <GlassIconTile icon={icon} hue={hue} />
        <div className={cn(HEADING_STACK, "min-w-0")}>
          <TitleTag
            className={cn(
              "text-lg font-medium leading-tight sm:text-xl",
              TitleTag === "h1"
                ? "bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent"
                : "text-white",
              titleClassName,
            )}
          >
            {title}
          </TitleTag>
          {subtitle ? (
            <p
              className={cn(
                "text-sm leading-snug text-white/70 sm:text-base",
                subtitleClassName,
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
