import { Loader2 } from "lucide-react";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type DataSurfaceSlotProps = { label: string; description: string; className?: string };

/**
 * REQ-0028 / C7.3: Local cold-data slot — spinner + pulse/shine copy so soft-nav
 * loading feels like a real destination page (title texts animate while waiting).
 */
export function DataSurfaceSlot({ label, description, className }: DataSurfaceSlotProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 sm:p-4 text-center",
        className,
      )}
    >
      <Loader2 className={cn(UI_ICON_CONTROL, "animate-spin text-blue-400")} aria-hidden />
      <p className="text-sm font-medium text-white/80 animate-pulse">{label}</p>
      <p className="text-xs text-white/55 animate-pulse">{description}</p>
    </div>
  );
}
