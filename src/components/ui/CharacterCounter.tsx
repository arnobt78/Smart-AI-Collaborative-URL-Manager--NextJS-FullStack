import { cn } from "@/lib/utils";

export type CharacterCounterProps = {
  current: number;
  max: number;
  className?: string;
};

export function CharacterCounter({
  current,
  max,
  className,
}: CharacterCounterProps) {
  const ratio = max > 0 ? current / max : 0;
  const warn = ratio >= 0.9;

  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        warn ? "text-amber-400/90" : "text-white/50",
        className,
      )}
      aria-live="polite"
    >
      {current}/{max}
    </span>
  );
}
