/**
 * Stockly-style leading icon tile — bordered, tinted, soft glow.
 */
import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
  UI_ICON_CONTROL,
  UI_ICON_TILE,
  UI_ICON_TILE_HUE,
  type UIIconTileHue,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type AnyIcon =
  | LucideIcon
  | ComponentType<SVGProps<SVGSVGElement> & { className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

type GlassIconTileProps = {
  icon: AnyIcon;
  hue?: UIIconTileHue;
  className?: string;
  iconClassName?: string;
};

export function GlassIconTile({
  icon: Icon,
  hue = "blue",
  className,
  iconClassName,
}: GlassIconTileProps) {
  return (
    <span
      className={cn(UI_ICON_TILE, UI_ICON_TILE_HUE[hue], className)}
      aria-hidden
    >
      <Icon className={cn(UI_ICON_CONTROL, iconClassName)} aria-hidden />
    </span>
  );
}
