/**
 * Shared SSE unified-update dedup so owner mutations that already densified
 * activity can skip the follow-up updates?activityLimit refetch.
 *
 * - seenKeys: events already scheduled (dedupe duplicate SSE)
 * - densifiedKeys: owner densify/mark — cancel pending invalidate
 */

const seenKeys = new Set<string>();
const densifiedKeys = new Set<string>();

let pendingInvalidationTimer: ReturnType<typeof setTimeout> | null = null;
let pendingInvalidationKey: string | null = null;

/** Owner fav/pin in flight — skip SSE unified invalidate for matching actions. */
let localFlagMutationUntil = 0;

const LOCAL_FLAG_SSE_ACTIONS = new Set([
  "url_favorited",
  "url_unfavorited",
  "url_pinned",
  "url_unpinned",
  "url_updated",
]);

/** Mark an SSE eventKey as densified by the owner and cancel any pending invalidate. */
export function markUnifiedEventProcessed(eventKey: string): void {
  if (!eventKey) return;
  densifiedKeys.add(eventKey);
  seenKeys.add(eventKey);
  trimSets();
  clearPendingUnifiedInvalidation();
}

export function hasUnifiedEventProcessed(eventKey: string): boolean {
  return densifiedKeys.has(eventKey) || seenKeys.has(eventKey);
}

export function hasUnifiedEventDensified(eventKey: string): boolean {
  return densifiedKeys.has(eventKey);
}

export function rememberUnifiedEventProcessed(eventKey: string): void {
  seenKeys.add(eventKey);
  trimSets();
}

export function clearPendingUnifiedInvalidation(): void {
  if (pendingInvalidationTimer) {
    clearTimeout(pendingInvalidationTimer);
    pendingInvalidationTimer = null;
    pendingInvalidationKey = null;
  }
}

/**
 * Debounce a unified invalidate. Owner mark() or local flag window cancels before fire.
 * Returns false if skipped immediately (already densified / already scheduled / local flag).
 */
export function scheduleUnifiedInvalidation(
  eventKey: string,
  delayMs: number,
  run: () => void,
  action?: string,
): boolean {
  if (eventKey && densifiedKeys.has(eventKey)) {
    return false;
  }
  if (action && isLocalFlagMutationActive() && LOCAL_FLAG_SSE_ACTIONS.has(action)) {
    if (eventKey) {
      densifiedKeys.add(eventKey);
      seenKeys.add(eventKey);
    }
    return false;
  }
  if (eventKey && seenKeys.has(eventKey)) {
    return false;
  }
  if (eventKey) {
    seenKeys.add(eventKey);
    trimSets();
  }

  clearPendingUnifiedInvalidation();
  pendingInvalidationKey = eventKey || null;
  pendingInvalidationTimer = setTimeout(() => {
    pendingInvalidationTimer = null;
    const key = pendingInvalidationKey;
    pendingInvalidationKey = null;
    if (key && densifiedKeys.has(key)) {
      return;
    }
    if (isLocalFlagMutationActive() && action && LOCAL_FLAG_SSE_ACTIONS.has(action)) {
      return;
    }
    run();
  }, delayMs);
  return true;
}

export function beginLocalFlagMutation(durationMs = 5000): void {
  localFlagMutationUntil = Date.now() + durationMs;
}

export function endLocalFlagMutation(): void {
  localFlagMutationUntil = 0;
}

export function isLocalFlagMutationActive(): boolean {
  return Date.now() < localFlagMutationUntil;
}

function trimSets(): void {
  for (const set of [seenKeys, densifiedKeys]) {
    if (set.size <= 100) continue;
    const entries = Array.from(set);
    set.clear();
    entries.slice(-100).forEach((key) => set.add(key));
  }
}

/** Test-only reset. */
export function __resetSseUnifiedDedupForTests(): void {
  seenKeys.clear();
  densifiedKeys.clear();
  clearPendingUnifiedInvalidation();
  localFlagMutationUntil = 0;
}
