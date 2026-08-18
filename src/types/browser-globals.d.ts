import type { UrlItem } from "@/stores/urlListStore";

interface ClearableCache {
  clear?: () => void;
}

/**
 * Client-only coordination state shared by imports, drag ordering, and real-time updates.
 * Keeping it here prevents unsafe window casts at every caller.
 */
declare global {
  interface AbortSignal {
    _cleanup?: () => void;
  }

  interface Window {
    __bulkImportActive?: boolean;
    __bulkImportJustCompleted?: boolean;
    __bulkImportDisableInterception?: boolean;
    __dragOrderCache?: Record<string, UrlItem[]>;
    __nextRouter?: {
      isPending?: boolean;
      cache?: ClearableCache;
    };
    __nextFetchCache?: ClearableCache;
    __NEXT_ROUTER_CACHE?: ClearableCache;
  }
}

export {};
