import { AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";

export type DescriptionRowProps = {
  text: string;
  className?: string;
  textClassName?: string;
  lineClamp?: boolean;
};

/** Description with top-aligned AlignLeft icon (first-line aligned). */
export function DescriptionRow({
  text,
  className,
  textClassName,
  lineClamp = false,
}: DescriptionRowProps) {
  return (
    <div className={cn("flex items-start gap-1 sm:gap-2 min-w-0", className)}>
      <AlignLeft
        className={cn(UI_ICON_CONTROL, "self-start mt-0.5 text-white/50")}
        aria-hidden
      />
      <p
        className={cn(
          "min-w-0 text-xs sm:text-sm text-white/60 break-words",
          lineClamp && "line-clamp-2",
          textClassName,
        )}
      >
        {text}
      </p>
    </div>
  );
}
