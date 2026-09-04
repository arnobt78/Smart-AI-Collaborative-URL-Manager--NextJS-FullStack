/** Max activities kept in unified feed UI + DB FIFO per list. */
export const ACTIVITY_FEED_LIMIT = 20;

/** Cap a feed array to the FIFO limit (newest-first assumed). */
export function sliceActivityFeed<T>(activities: readonly T[]): T[] {
  return activities.length > ACTIVITY_FEED_LIMIT
    ? activities.slice(0, ACTIVITY_FEED_LIMIT)
    : [...activities];
}

/** Clamp a requested activityLimit query param to [1, ACTIVITY_FEED_LIMIT]. */
export function clampActivityLimit(raw: unknown, fallback = ACTIVITY_FEED_LIMIT): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? parseInt(raw, 10)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), ACTIVITY_FEED_LIMIT);
}
