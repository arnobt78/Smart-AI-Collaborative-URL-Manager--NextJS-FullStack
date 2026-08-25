"use client";

/**
 * Shared Recharts tooltip for Insights charts (C7.11).
 * Glass panel with label/date + series name/value (+ optional percent).
 */

export type InsightsTooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

export type InsightsChartTooltipProps = {
  active?: boolean;
  payload?: InsightsTooltipEntry[];
  label?: string | number;
  /** Prefer payload[0].payload.date when present */
  dateKey?: string;
  /** Show percent of total across payload values */
  showPercent?: boolean;
};

export function InsightsChartTooltip({
  active,
  payload,
  label,
  dateKey = "date",
  showPercent = false,
}: InsightsChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const first = payload[0];
  const fromPayload =
    first?.payload && typeof first.payload[dateKey] === "string"
      ? (first.payload[dateKey] as string)
      : undefined;
  const heading =
    fromPayload ||
    (label != null && label !== "" ? String(label) : undefined) ||
    first?.name ||
    "Details";

  const total = showPercent
    ? payload.reduce((sum, e) => {
        const n = typeof e.value === "number" ? e.value : Number(e.value);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0)
    : 0;

  return (
    <div className="rounded-lg border border-white/20 bg-zinc-900/95 p-3 shadow-xl backdrop-blur-md min-w-[9rem]">
      <p className="text-xs sm:text-sm text-white/60 mb-1.5">{heading}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => {
          const n =
            typeof entry.value === "number"
              ? entry.value
              : Number(entry.value);
          const pct =
            showPercent && total > 0 && Number.isFinite(n)
              ? ` (${Math.round((n / total) * 100)}%)`
              : "";
          return (
            <p
              key={`${entry.name ?? "series"}-${index}`}
              className="text-xs sm:text-sm text-white"
              style={entry.color ? { color: entry.color } : undefined}
            >
              <span className="text-white/80">{entry.name ?? "Value"}:</span>{" "}
              <span className="font-medium text-white">
                {entry.value ?? "—"}
                {pct}
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
