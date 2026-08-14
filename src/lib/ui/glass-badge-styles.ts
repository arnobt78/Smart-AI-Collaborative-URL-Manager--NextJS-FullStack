/**
 * Glass badges — ported from stock-inventory (dark-app subset).
 */

export type GlassBadgeHue =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "gray";

/** Glass gradient pill + soft glow */
export const GLASS_BADGE_CLASS: Record<GlassBadgeHue, string> = {
  blue: "border border-blue-400/35 bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-blue-500/5 text-sky-300 shadow-[0_10px_28px_rgba(59,130,246,0.18)] backdrop-blur-md",
  violet:
    "border border-violet-400/35 bg-gradient-to-r from-violet-500/20 via-violet-500/10 to-violet-500/5 text-violet-300 shadow-[0_10px_28px_rgba(139,92,246,0.18)] backdrop-blur-md",
  emerald:
    "border border-emerald-400/35 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 text-emerald-300 shadow-[0_10px_28px_rgba(16,185,129,0.18)] backdrop-blur-md",
  amber:
    "border border-amber-400/35 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-300 shadow-[0_10px_28px_rgba(245,158,11,0.18)] backdrop-blur-md",
  rose: "border border-rose-400/35 bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-rose-500/5 text-rose-300 shadow-[0_10px_28px_rgba(225,29,72,0.18)] backdrop-blur-md",
  sky: "border border-sky-400/35 bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-sky-500/5 text-sky-300 shadow-[0_10px_28px_rgba(2,132,199,0.18)] backdrop-blur-md",
  gray: "border border-gray-400/35 bg-gradient-to-r from-gray-500/20 via-gray-500/10 to-gray-500/5 text-gray-300 shadow-[0_10px_28px_rgba(107,114,128,0.16)] backdrop-blur-md",
};
