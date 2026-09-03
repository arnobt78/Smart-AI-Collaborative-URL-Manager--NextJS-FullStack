/**
 * Glass shadow-glow buttons — ported from stock-inventory/lib/ui/glass-button-styles.ts
 * (dark-app subset: blue, violet, emerald, amber, rose, sky).
 * Recipe: border-400/30 + from-70/via-50/to-30 + shadow-[0_15px_35px] → hover 0_20px_45px.
 */
import { cn } from "@/lib/utils";
import { UI_CONTROL_HEIGHT, UI_CONTROL_ICON_GAP } from "@/lib/ui/control-styles";

export type GlassButtonHue =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "sky";

/** Parent must include `group` — scales child svg on hover. */
export const GLASS_BUTTON_ICON_HOVER =
  "group [&_svg]:transition-transform [&_svg]:duration-200 group-hover:[&_svg]:scale-110";

export const GLASS_BUTTON_DISABLED =
  "disabled:opacity-50 disabled:cursor-not-allowed";

const PRIMARY_LAYOUT =
  `${UI_CONTROL_HEIGHT} inline-flex items-center justify-center ${UI_CONTROL_ICON_GAP} rounded-xl backdrop-blur-md transition duration-200 !text-white font-medium`;

/** Soft toolbar/action — lighter fill, still colored glow */
const ACTION_LAYOUT =
  `inline-flex items-center justify-center ${UI_CONTROL_ICON_GAP} rounded-xl backdrop-blur-md transition duration-200 font-medium !text-white`;

/** Cancel / ghost */
export const GLASS_GHOST_BUTTON =
  `${UI_CONTROL_HEIGHT} inline-flex items-center justify-center ${UI_CONTROL_ICON_GAP} rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_15px_35px_rgba(0,0,0,0.3)] transition duration-200 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)] text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed`;

const PRIMARY_BLUE = `${PRIMARY_LAYOUT} border border-blue-400/30 bg-gradient-to-r from-blue-500/70 via-blue-500/50 to-blue-500/30 shadow-[0_15px_35px_rgba(59,130,246,0.45)] hover:border-blue-300/40 hover:from-blue-500/80 hover:via-blue-500/60 hover:to-blue-500/40 hover:shadow-[0_20px_45px_rgba(59,130,246,0.6)]`;

const PRIMARY_VIOLET = `${PRIMARY_LAYOUT} border border-violet-400/30 bg-gradient-to-r from-violet-500/70 via-violet-500/50 to-violet-500/30 shadow-[0_15px_35px_rgba(139,92,246,0.45)] hover:border-violet-300/40 hover:from-violet-500/80 hover:via-violet-500/60 hover:to-violet-500/40 hover:shadow-[0_20px_45px_rgba(139,92,246,0.6)]`;

const PRIMARY_EMERALD = `${PRIMARY_LAYOUT} border border-emerald-400/30 bg-gradient-to-r from-emerald-500/70 via-emerald-500/50 to-emerald-500/30 shadow-[0_15px_35px_rgba(16,185,129,0.45)] hover:border-emerald-300/40 hover:from-emerald-500/80 hover:via-emerald-500/60 hover:to-emerald-500/40 hover:shadow-[0_20px_45px_rgba(16,185,129,0.6)]`;

const PRIMARY_AMBER = `${PRIMARY_LAYOUT} border border-amber-400/30 bg-gradient-to-r from-amber-500/70 via-amber-500/50 to-amber-500/30 shadow-[0_15px_35px_rgba(245,158,11,0.45)] hover:border-amber-300/40 hover:from-amber-500/80 hover:via-amber-500/60 hover:to-amber-500/40 hover:shadow-[0_20px_45px_rgba(245,158,11,0.6)]`;

const PRIMARY_ROSE = `${PRIMARY_LAYOUT} border border-rose-400/30 bg-gradient-to-r from-rose-500/70 via-rose-500/50 to-rose-500/30 shadow-[0_15px_35px_rgba(225,29,72,0.45)] hover:border-rose-300/40 hover:from-rose-500/80 hover:via-rose-500/60 hover:to-rose-500/40 hover:shadow-[0_20px_45px_rgba(225,29,72,0.6)]`;

const PRIMARY_SKY = `${PRIMARY_LAYOUT} border border-sky-400/30 bg-gradient-to-r from-sky-500/70 via-sky-500/50 to-sky-500/30 shadow-[0_15px_35px_rgba(2,132,199,0.45)] hover:border-sky-300/40 hover:from-sky-500/80 hover:via-sky-500/60 hover:to-sky-500/40 hover:shadow-[0_20px_45px_rgba(2,132,199,0.6)]`;

const ACTION_BLUE = `${ACTION_LAYOUT} border border-blue-400/30 bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent hover:from-blue-500/30 hover:border-blue-300/40 shadow-[0_10px_30px_rgba(59,130,246,0.2)]`;

const ACTION_VIOLET = `${ACTION_LAYOUT} border border-violet-400/30 bg-gradient-to-r from-violet-500/20 via-violet-500/10 to-transparent hover:from-violet-500/30 hover:border-violet-300/40 shadow-[0_10px_30px_rgba(139,92,246,0.2)]`;

const ACTION_EMERALD = `${ACTION_LAYOUT} border border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent hover:from-emerald-500/30 hover:border-emerald-300/40 shadow-[0_10px_30px_rgba(16,185,129,0.2)]`;

const ACTION_AMBER = `${ACTION_LAYOUT} border border-amber-400/30 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent hover:from-amber-500/30 hover:border-amber-300/40 shadow-[0_10px_30px_rgba(245,158,11,0.2)]`;

const ACTION_ROSE = `${ACTION_LAYOUT} border border-rose-400/30 bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-transparent hover:from-rose-500/30 hover:border-rose-300/40 shadow-[0_10px_30px_rgba(225,29,72,0.2)]`;

const ACTION_SKY = `${ACTION_LAYOUT} border border-sky-400/30 bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-transparent hover:from-sky-500/30 hover:border-sky-300/40 shadow-[0_10px_30px_rgba(2,132,199,0.2)]`;

/** Strong CTA — Auth Sign In, Create, dialog submit */
export const GLASS_PRIMARY_BUTTON: Record<GlassButtonHue, string> = {
  blue: PRIMARY_BLUE,
  violet: PRIMARY_VIOLET,
  emerald: PRIMARY_EMERALD,
  amber: PRIMARY_AMBER,
  rose: PRIMARY_ROSE,
  sky: PRIMARY_SKY,
};

/** Softer toolbar actions — Schedule / Metadata / Health */
export const GLASS_ACTION_BUTTON: Record<GlassButtonHue, string> = {
  blue: ACTION_BLUE,
  violet: ACTION_VIOLET,
  emerald: ACTION_EMERALD,
  amber: ACTION_AMBER,
  rose: ACTION_ROSE,
  sky: ACTION_SKY,
};

export function glassPrimaryButtonClass(
  hue: GlassButtonHue,
  extra?: string,
): string {
  return cn(
    GLASS_BUTTON_ICON_HOVER,
    GLASS_BUTTON_DISABLED,
    GLASS_PRIMARY_BUTTON[hue],
    extra,
  );
}

export function glassActionButtonClass(
  hue: GlassButtonHue,
  extra?: string,
): string {
  return cn(
    GLASS_BUTTON_ICON_HOVER,
    GLASS_BUTTON_DISABLED,
    GLASS_ACTION_BUTTON[hue],
    extra,
  );
}
