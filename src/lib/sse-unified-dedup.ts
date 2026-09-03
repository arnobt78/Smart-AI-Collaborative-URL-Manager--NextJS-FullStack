/**
 * Shared SSE unified-update dedup so owner mutations that already densified
 * activity can skip the follow-up updates?activityLimit=30 refetch.
 */

const processedInvocations = new Set<string>();

/** Mark an SSE eventKey as already applied. */
export function markUnifiedEventProcessed(eventKey: string): void {
  if (!eventKey) return;
  processedInvocations.add(eventKey);
  trimProcessedInvocations();
}

export function hasUnifiedEventProcessed(eventKey: string): boolean {
  return processedInvocations.has(eventKey);
}

export function rememberUnifiedEventProcessed(eventKey: string): void {
  processedInvocations.add(eventKey);
  trimProcessedInvocations();
}

function trimProcessedInvocations(): void {
  if (processedInvocations.size <= 100) return;
  const entries = Array.from(processedInvocations);
  processedInvocations.clear();
  entries.slice(-100).forEach((key) => processedInvocations.add(key));
}
