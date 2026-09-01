/** True when AI returns a placeholder name that should be replaced by heuristics. */
export function isGenericCollectionName(name: string | undefined | null): boolean {
  const normalized = (name || "").trim();
  if (!normalized) return true;
  const lower = normalized.toLowerCase();
  return (
    lower === "untitled collection" ||
    lower === "related urls" ||
    lower === "all urls" ||
    lower === "miscellaneous" ||
    lower === "misc"
  );
}

/** Prefer heuristic name when AI output is generic or empty. */
export function resolveCollectionName(
  aiName: string | undefined,
  heuristicName: string,
): string {
  return isGenericCollectionName(aiName) ? heuristicName : (aiName || heuristicName);
}
