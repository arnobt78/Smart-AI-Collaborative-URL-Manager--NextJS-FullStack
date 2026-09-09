/**
 * Client-side vector index sync — on demand (Similar / smart search), not on
 * every list mount (Track B Wave 2).
 */

const STORAGE_KEY = "vector-synced-lists";

let syncInFlightId: string | null = null;

function readSyncedIds(storage: Storage): string[] {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || "[]") as unknown;
    return Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function hasListSyncedVectors(listId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (readSyncedIds(localStorage).includes(listId)) return true;
    if (readSyncedIds(sessionStorage).includes(listId)) return true;
  } catch {
    /* storage denied */
  }
  return false;
}

export function markListVectorSynced(listId: string): void {
  if (typeof window === "undefined") return;
  try {
    for (const storage of [localStorage, sessionStorage]) {
      const next = new Set(readSyncedIds(storage));
      next.add(listId);
      storage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    }
  } catch {
    /* storage denied */
  }
}

function clearListVectorSynced(listId: string): void {
  if (typeof window === "undefined") return;
  try {
    for (const storage of [localStorage, sessionStorage]) {
      const next = readSyncedIds(storage).filter((id) => id !== listId);
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Fire-and-forget POST sync-vectors once per list. Safe to call on Similar open.
 */
export function ensureListVectorsSynced(listId: string | null | undefined): void {
  if (!listId || typeof window === "undefined") return;
  if (hasListSyncedVectors(listId) || syncInFlightId === listId) return;

  syncInFlightId = listId;
  markListVectorSynced(listId);

  void (async () => {
    try {
      const response = await fetch(`/api/lists/${listId}/sync-vectors`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Vector sync failed");
      if (!hasListSyncedVectors(listId)) markListVectorSynced(listId);
    } catch {
      clearListVectorSynced(listId);
    } finally {
      if (syncInFlightId === listId) syncInFlightId = null;
    }
  })();
}
