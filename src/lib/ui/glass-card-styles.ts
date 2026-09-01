/**
 * Glass card / panel shells — ported from stock-inventory GlassCard (dark-app).
 */

/** Generic Card primitive (insights, API docs, and other non-list-detail surfaces). */
export const GLASS_CARD =
  "rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg";

/** List/browse/detail contract — stronger shadow + sm:rounded-2xl (not for generic Card). */
export const GLASS_LIST_CARD =
  "bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-xl";

/** Clickable list/browse cards — compose with GLASS_LIST_CARD. */
export const GLASS_LIST_CARD_INTERACTIVE =
  "transition-all duration-200 hover:bg-white/10 hover:border-blue-400/30 cursor-pointer";

export type GlassCardHue =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "sky";

export const GLASS_PANEL_CARD: Record<GlassCardHue, string> = {
  blue: "rounded-[20px] border border-blue-400/20 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent shadow-[0_15px_40px_rgba(59,130,246,0.15)] backdrop-blur-md hover:border-blue-300/40 transition-all duration-300",
  violet:
    "rounded-[20px] border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent shadow-[0_15px_40px_rgba(139,92,246,0.15)] backdrop-blur-md hover:border-violet-300/40 transition-all duration-300",
  emerald:
    "rounded-[20px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent shadow-[0_15px_40px_rgba(16,185,129,0.15)] backdrop-blur-md hover:border-emerald-300/40 transition-all duration-300",
  amber:
    "rounded-[20px] border border-amber-400/20 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent shadow-[0_15px_40px_rgba(245,158,11,0.12)] backdrop-blur-md hover:border-amber-300/40 transition-all duration-300",
  rose: "rounded-[20px] border border-rose-400/20 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent shadow-[0_15px_40px_rgba(225,29,72,0.15)] backdrop-blur-md hover:border-rose-300/40 transition-all duration-300",
  sky: "rounded-[20px] border border-sky-400/20 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent shadow-[0_15px_40px_rgba(2,132,199,0.15)] backdrop-blur-md hover:border-sky-300/40 transition-all duration-300",
};

/** KPI / stat tiles — stronger glow (StatisticsCard recipe) */
export const GLASS_STAT_CARD: Record<GlassCardHue, string> = {
  blue: "rounded-[28px] border border-blue-400/30 bg-gradient-to-br from-blue-500/25 via-blue-500/10 to-blue-500/5 shadow-[0_30px_80px_rgba(59,130,246,0.35)] backdrop-blur-md hover:border-blue-300/50 transition",
  violet:
    "rounded-[28px] border border-violet-400/30 bg-gradient-to-br from-violet-500/25 via-violet-500/10 to-violet-500/5 shadow-[0_30px_80px_rgba(139,92,246,0.35)] backdrop-blur-md hover:border-violet-300/50 transition",
  emerald:
    "rounded-[28px] border border-emerald-400/30 bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-emerald-500/5 shadow-[0_30px_80px_rgba(16,185,129,0.35)] backdrop-blur-md hover:border-emerald-300/50 transition",
  amber:
    "rounded-[28px] border border-amber-400/30 bg-gradient-to-br from-amber-500/25 via-amber-500/10 to-amber-500/5 shadow-[0_30px_80px_rgba(245,158,11,0.3)] backdrop-blur-md hover:border-amber-300/50 transition",
  rose: "rounded-[28px] border border-rose-400/30 bg-gradient-to-br from-rose-500/25 via-rose-500/10 to-rose-500/5 shadow-[0_30px_80px_rgba(225,29,72,0.35)] backdrop-blur-md hover:border-rose-300/50 transition",
  sky: "rounded-[28px] border border-sky-400/30 bg-gradient-to-br from-sky-500/25 via-sky-500/10 to-sky-500/5 shadow-[0_30px_80px_rgba(2,132,199,0.35)] backdrop-blur-md hover:border-sky-300/50 transition",
};
