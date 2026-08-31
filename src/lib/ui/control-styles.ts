// REQ-0010: Shared 48px control geometry for aligned interactive rows.

/** Labeled inputs, selects, buttons, filters, and menu triggers share this height. */
export const UI_CONTROL_HEIGHT = "h-10 min-h-10";

/** Standard icon-to-label spacing for readable labeled actions. */
export const UI_CONTROL_ICON_GAP = "gap-2";

/** Reusable glass form-control foundation, with visible keyboard focus. */
export const UI_FORM_CONTROL =
  "w-full h-10 min-h-10 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-3 text-sm text-white placeholder:text-sm placeholder:text-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-50";

/** Shared trigger layout for filters and import/export controls. */
export const UI_CONTROL_TRIGGER = `${UI_CONTROL_HEIGHT} ${UI_CONTROL_ICON_GAP} inline-flex items-center justify-center rounded-xl px-3 text-xs font-medium sm:text-sm whitespace-nowrap transition-all duration-200`;

/** Shared content alignment for responsive application chrome rows. */
export const UI_CHROME_ROW = "flex w-full items-center justify-between";

/** Square icon-only … / overflow menu trigger (matches Back / chrome h-10). */
export const UI_ICON_MENU_TRIGGER = `${UI_CONTROL_HEIGHT} w-10 shrink-0 px-0 text-white/80 hover:text-white hover:bg-white/10`;

/**
 * Portaled glass menu panel (fixed). z below Dialog (1000) / tooltips (9999),
 * above list-detail cards so menus are not covered by later siblings.
 */
export const UI_GLASS_MENU_PANEL =
  "fixed z-[900] origin-top-right rounded-xl border border-white/20 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-1 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150";
