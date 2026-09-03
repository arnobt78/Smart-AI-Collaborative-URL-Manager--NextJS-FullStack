// REQ-0010: Shared 48px control geometry for aligned interactive rows.

/** Labeled inputs, selects, buttons, filters, and menu triggers share this height. */
export const UI_CONTROL_HEIGHT = "h-10 min-h-10";

/** Standard icon-to-label spacing for readable labeled actions. */
export const UI_CONTROL_ICON_GAP = "gap-1";

/** Interactive control glyphs (buttons, chips, filters, menus, close, spinners). */
export const UI_ICON_CONTROL = "h-5 w-5 shrink-0";

/** Page headers, feature cards, empty-state heroes, brand marks. */
export const UI_ICON_DECORATIVE = "h-6 w-6 sm:h-8 sm:w-8 shrink-0";

/** Reusable glass form-control foundation, with visible keyboard focus. */
export const UI_FORM_CONTROL =
  "w-full h-10 min-h-10 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-3 text-sm text-white placeholder:text-sm placeholder:text-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-50";

/** Shared trigger layout for filters and import/export controls. */
export const UI_CONTROL_TRIGGER = `${UI_CONTROL_HEIGHT} ${UI_CONTROL_ICON_GAP} inline-flex items-center justify-center rounded-xl px-3 text-xs font-medium sm:text-sm whitespace-nowrap transition-all duration-200`;

/** Shared content alignment for responsive application chrome rows. */
export const UI_CHROME_ROW = "flex w-full items-center justify-between";

/** Square icon-only … / overflow menu trigger (matches Back / chrome h-10). */
export const UI_ICON_MENU_TRIGGER = `${UI_CONTROL_HEIGHT} w-10 shrink-0 px-0 text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0`;

/**
 * Glass dropdown panel chrome for Radix DropdownMenu Content.
 * z below Dialog (1000) / tooltips (9999), above list-detail cards.
 * Positioning is handled by Radix (absolute in portal); do not use `fixed` here.
 */
export const UI_GLASS_MENU_PANEL =
  "z-[900] rounded-xl border border-white/20 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-1 text-white shadow-2xl backdrop-blur-md outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

/** Glass menu row / DropdownMenuItem defaults. */
export const UI_GLASS_MENU_ITEM =
  "relative flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 outline-none transition-colors focus:bg-white/10 focus:text-white focus-visible:ring-0 focus-visible:ring-offset-0 data-[highlighted]:bg-white/10 data-[highlighted]:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-40";

/** Subtle keyboard focus for dropdown triggers only (not panel/items). */
export const UI_GLASS_MENU_TRIGGER_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0";

/** Glass menu separator. */
export const UI_GLASS_MENU_SEPARATOR = "-mx-1 my-1 h-px bg-white/10";

/** Section header count pill (Collaborators, Activity, Smart Collections, tabs). */
export const UI_SECTION_COUNT_BADGE =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-blue-400/50 bg-blue-500/30 px-1.5 text-xs text-center text-blue-200";

/** List-card metadata pills (URL count, visibility) — fixed height for icon-only + text badges. */
export const UI_LIST_CARD_META_BADGE =
  "inline-flex h-6 min-h-6 items-center justify-center gap-1 rounded-full px-2.5 text-xs";
