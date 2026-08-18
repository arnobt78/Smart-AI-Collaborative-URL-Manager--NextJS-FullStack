// REQ-0010: Shared 48px control geometry for aligned interactive rows.

/** Labeled inputs, selects, buttons, filters, and menu triggers share this height. */
export const UI_CONTROL_HEIGHT = "h-12 min-h-12";

/** Standard icon-to-label spacing for readable labeled actions. */
export const UI_CONTROL_ICON_GAP = "gap-2";

/** Reusable glass form-control foundation, with visible keyboard focus. */
export const UI_FORM_CONTROL =
  "w-full h-12 min-h-12 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-3 text-sm sm:text-base text-white placeholder:text-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-50";

/** Shared trigger layout for filters and import/export controls. */
export const UI_CONTROL_TRIGGER =
  `${UI_CONTROL_HEIGHT} ${UI_CONTROL_ICON_GAP} inline-flex items-center justify-center rounded-xl px-3 text-xs font-medium sm:text-sm whitespace-nowrap transition-all duration-200`;

/** Shared content alignment for responsive application chrome rows. */
export const UI_CHROME_ROW = "flex w-full items-center justify-between";
