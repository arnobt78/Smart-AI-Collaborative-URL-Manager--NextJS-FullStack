/**
 * ui-spacing — shared vertical rhythm tokens.
 * Prefer these on page/section/form/list roots instead of per-child mb/pb.
 * Card chrome pad stays in Card.tsx (p-2 sm:p-4) — CARD_PAD mirrors that for raw divs.
 */

/** Page root: header → tools → content */
export const PAGE_STACK = "flex flex-col space-y-6 sm:space-y-8";

/** Hero / CTA / welcome columns */
export const SECTION_STACK = "flex flex-col space-y-4 sm:space-y-6";

/**
 * Marketing / welcome / hero / CTA — larger gap (pre-collapse mb-6/8 rhythm).
 * Prefer over SECTION_STACK for landing + Auth welcome.
 */
export const MARKETING_STACK = "flex flex-col gap-6 sm:gap-8";

/** Auth + form field groups */
export const FORM_STACK = "space-y-3 sm:space-y-4";

/** Vertical card lists (My Lists) — gap-* (space-y collapses between bordered cards) */
export const LIST_STACK = "flex flex-col gap-4 sm:gap-6";

/** Title + subtitle — no gap between lines (tight stack) */
export const PAGE_HEADER = "flex flex-col gap-0";

/** Align with Card Header/Content pad where raw divs mimic cards */
export const CARD_PAD = "p-2 sm:p-4";
