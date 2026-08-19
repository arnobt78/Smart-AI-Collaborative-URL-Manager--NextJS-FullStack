import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DataSurfaceSlotProps = { label: string; description: string; className?: string };

/** REQ-0028: A local cold-data slot preserves the already-rendered page shell. */
export function DataSurfaceSlot({ label, description, className }: DataSurfaceSlotProps) {
  return (
    <div aria-busy="true" aria-live="polite" className={cn("flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center", className)}>
      <Loader2 className="size-5 animate-spin text-blue-400" aria-hidden />
      <p className="text-sm font-medium text-white/80">{label}</p>
      <p className="text-xs text-white/55">{description}</p>
    </div>
  );
}
