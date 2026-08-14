/**
 * Global abort registry to track and cancel all active fetch requests
 * This prevents navigation from getting stuck due to pending requests
 */

class AbortRegistry {
  private controllers: Set<AbortController> = new Set();
  private fetchMap: WeakMap<AbortController, Set<Promise<any>>> = new WeakMap();
  private globalFetchControllers: Map<string, AbortController> = new Map();
  private isIntercepting: boolean = false;
  private originalFetch: typeof fetch | null = null;
  // CRITICAL FIX: Permanent backup of the VERY FIRST original fetch
  // This ensures we can always restore even if originalFetch gets overwritten
  private permanentOriginalFetch: typeof fetch | null = null;
  // NATIVE BACKUP: Capture true browser fetch at construction (never mutated)
  private nativeFetchBackup: typeof fetch | null =
    typeof window !== "undefined" && typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : null;

  constructor() {
    // Just emit a debug log (additive) so we know native fetch was captured
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.debug(
        "💾 [ABORT_REGISTRY] Captured native fetch backup at construction"
      );
    }
  }

  /**
   * Register an AbortController to track
   */
  register(controller: AbortController): void {
    this.controllers.add(controller);

    // Store promises associated with this controller
    if (!this.fetchMap.has(controller)) {
      this.fetchMap.set(controller, new Set());
    }
  }

  /**
   * Register a fetch promise to track
   */
  registerPromise(controller: AbortController, promise: Promise<any>): void {
    if (!this.fetchMap.has(controller)) {
      this.fetchMap.set(controller, new Set());
    }
    this.fetchMap.get(controller)!.add(promise);
  }

  /**
   * Unregister an AbortController
   */
  unregister(controller: AbortController): void {
    this.controllers.delete(controller);
  }

  /**
   * Start intercepting ALL fetch calls globally (including Next.js internal RSC requests)
   * CRITICAL: This allows us to abort even Next.js router requests
   * NOTE: Only intercepts when __bulkImportActive is true to avoid interfering with normal navigation
   */
  startGlobalInterception(): void {
    if (typeof window === "undefined" || this.isIntercepting) {
      return;
    }

    // Store original fetch
    this.originalFetch = window.fetch;

    // ADDITIVE: If originalFetch already appears to be our wrapper, fall back to permanent or native backup
    try {
      const currentStr = this.originalFetch.toString();
      if (
        currentStr.includes("__bulkImportActive") ||
        currentStr.includes("globalFetchControllers")
      ) {
        if (this.permanentOriginalFetch) {
          this.originalFetch = this.permanentOriginalFetch;
          if (process.env.NODE_ENV === "development") {
            console.debug(
              "🔁 [ABORT_REGISTRY] Detected recursive wrapper; using permanentOriginalFetch"
            );
          }
        } else if (this.nativeFetchBackup) {
          this.originalFetch = this.nativeFetchBackup;
          if (process.env.NODE_ENV === "development") {
            console.debug(
              "🔁 [ABORT_REGISTRY] Detected recursive wrapper; using nativeFetchBackup"
            );
          }
        }
      }
    } catch {}

    // CRITICAL FIX: Store permanent backup on FIRST interception only
    if (!this.permanentOriginalFetch) {
      this.permanentOriginalFetch = window.fetch;
      if (process.env.NODE_ENV === "development") {
        console.debug(
          `🔒 [ABORT_REGISTRY] Stored permanent backup of original fetch`
        );
      }
    }

    // Intercept fetch to track ALL requests (including Next.js RSC)
    // Arrow keeps `this` bound to AbortRegistry (avoids no-this-alias)
    window.fetch = (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      // BYPASS FLAG: Explicit hard disable of interception (additive safeguard)
      if (
        typeof window !== "undefined" &&
        (window as any).__bulkImportDisableInterception
      ) {
        return (this.originalFetch || this.nativeFetchBackup || fetch).call(
          window,
          input,
          init
        );
      }
      // CRITICAL: Only intercept if bulk import is active
      // This prevents interference with normal navigation after import completes
      if (
        typeof window !== "undefined" &&
        !(window as any).__bulkImportActive
      ) {
        // Import completed, use original fetch without interception
        return this.originalFetch!.call(window, input, init);
      }

      // Create a controller for this fetch
      const controller = new AbortController();
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : input instanceof Request
          ? input.url
          : String(input);
      const requestId = `${url}_${Date.now()}_${Math.random()}`;

      // Track this controller
      this.globalFetchControllers.set(requestId, controller);

      // Merge abort signals if provided
      const existingSignal = init?.signal;
      let finalSignal: AbortSignal;

      if (existingSignal) {
        // If both signals abort, abort the controller
        if (existingSignal.aborted) {
          controller.abort();
          finalSignal = controller.signal;
        } else {
          existingSignal.addEventListener("abort", () => {
            if (!controller.signal.aborted) {
              controller.abort();
            }
          });
          finalSignal = controller.signal;
        }
      } else {
        finalSignal = controller.signal;
      }

      // Call original fetch with abort signal
      const fetchPromise = this
        .originalFetch!.call(window, input, {
          ...init,
          signal: finalSignal,
        })
        .finally(() => {
          // Clean up after fetch completes
          this.globalFetchControllers.delete(requestId);
        });

      return fetchPromise;
    };

    this.isIntercepting = true;

    if (process.env.NODE_ENV === "development") {
      console.debug(`🔍 [ABORT_REGISTRY] Started global fetch interception`);
    }
  }

  /**
   * Stop intercepting fetch calls
   */
  stopGlobalInterception(): void {
    if (typeof window === "undefined") {
      return;
    }

    // CRITICAL FIX: Check if window.fetch is currently wrapped BEFORE attempting restoration
    const fetchStr = window.fetch.toString();
    const isCurrentlyWrapped =
      fetchStr.includes("__bulkImportActive") ||
      fetchStr.includes("globalFetchControllers");

    // Try to restore from primary reference first, then permanent backup
    let restored = false;

    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      restored = true;

      if (process.env.NODE_ENV === "development") {
        console.debug(
          `🔍 [ABORT_REGISTRY] Restored original window.fetch from primary reference`
        );
      }
    } else if (this.permanentOriginalFetch) {
      // Fallback to permanent backup
      window.fetch = this.permanentOriginalFetch;
      this.originalFetch = this.permanentOriginalFetch; // Restore primary reference too
      restored = true;

      if (process.env.NODE_ENV === "development") {
        console.debug(
          `🔍 [ABORT_REGISTRY] Restored original window.fetch from PERMANENT BACKUP`
        );
      }
    } else if (isCurrentlyWrapped) {
      // CRITICAL: If fetch is wrapped but we don't have ANY reference,
      // this is a critical bug
      if (process.env.NODE_ENV === "development") {
        console.error(
          "❌ [ABORT_REGISTRY] CRITICAL: window.fetch is wrapped but NO originalFetch reference exists!"
        );
        console.error(
          "❌ [ABORT_REGISTRY] Fetch interception will remain active - navigation will be blocked"
        );
      }
    }

    this.isIntercepting = false;

    // Verify restoration
    if (process.env.NODE_ENV === "development" && restored) {
      const newFetchStr = window.fetch.toString();
      const stillWrapped =
        newFetchStr.includes("__bulkImportActive") ||
        newFetchStr.includes("globalFetchControllers");

      if (stillWrapped) {
        console.error(
          "❌ [ABORT_REGISTRY] CRITICAL: window.fetch is STILL wrapped after restoration attempt!"
        );
        // NUCLEAR FALLBACK: Force native restoration if we still have a backup
        if (this.nativeFetchBackup) {
          window.fetch = this.nativeFetchBackup;
          this.originalFetch = this.nativeFetchBackup;
          if (process.env.NODE_ENV === "development") {
            const nativeStr = window.fetch.toString();
            const nativeWrapped =
              nativeStr.includes("__bulkImportActive") ||
              nativeStr.includes("globalFetchControllers");
            if (!nativeWrapped) {
              console.debug(
                "✅ [ABORT_REGISTRY] Nuclear native fetch restoration applied successfully"
              );
            } else {
              console.error(
                "❌ [ABORT_REGISTRY] Nuclear native restoration failed – fetch still appears wrapped"
              );
            }
          }
        }
      } else {
        console.debug(
          `✅ [ABORT_REGISTRY] Verified window.fetch is restored (no wrapper detected)`
        );
      }
    }
  }

  // ADDITIVE: Explicit public nuclear method (never called before) to hard restore
  forceRestoreNativeFetch(): void {
    if (typeof window === "undefined") return;
    if (this.nativeFetchBackup) {
      window.fetch = this.nativeFetchBackup;
      this.originalFetch = this.nativeFetchBackup;
      if (process.env.NODE_ENV === "development") {
        console.debug("🚨 [ABORT_REGISTRY] forceRestoreNativeFetch() applied");
      }
    }
  }

  /**
   * Abort all registered controllers AND all intercepted global fetch requests
   * CRITICAL: This prevents navigation from getting stuck, including Next.js RSC requests
   */
  abortAll(): void {
    const registeredCount = this.controllers.size;
    const interceptedCount = this.globalFetchControllers.size;
    const totalCount = registeredCount + interceptedCount;

    if (process.env.NODE_ENV === "development" && totalCount > 0) {
      console.debug(
        `🛑 [ABORT_REGISTRY] Aborting ${totalCount} active request(s) (${registeredCount} registered, ${interceptedCount} intercepted) to allow navigation`
      );
    }

    // Abort all registered controllers
    const controllersToAbort = Array.from(this.controllers);
    controllersToAbort.forEach((controller) => {
      try {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (error) {
        // Ignore errors - controller might already be aborted
      }
    });

    // Abort all intercepted global fetch requests
    const globalControllersToAbort = Array.from(
      this.globalFetchControllers.values()
    );
    globalControllersToAbort.forEach((controller) => {
      try {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (error) {
        // Ignore errors - controller might already be aborted
      }
    });

    // Clear all controllers after aborting
    this.controllers.clear();
    this.globalFetchControllers.clear();
  }

  /**
   * Get count of active controllers (both registered and intercepted)
   */
  getCount(): number {
    return this.controllers.size + this.globalFetchControllers.size;
  }

  /**
   * Force abort ALL pending fetch requests globally (nuclear option)
   * This includes requests that might not be registered or intercepted
   * CRITICAL: Use this as a last resort when navigation is completely stuck
   */
  forceAbortAllGlobal(): void {
    if (typeof window === "undefined") {
      return;
    }

    // First, abort all registered and intercepted requests
    this.abortAll();

    // Then, try to abort any other pending requests via browser APIs
    // This is a workaround for requests we might have missed
    try {
      // Force clear all Next.js router caches
      const nextRouter = (window as any).__NEXT_DATA__?.router;
      if (nextRouter?.prefetchCache) {
        nextRouter.prefetchCache.clear();
      }

      const routerInstance = (window as any).__nextRouter;
      if (routerInstance) {
        if (routerInstance.isPending !== undefined) {
          routerInstance.isPending = false;
        }
        if (routerInstance.cache) {
          routerInstance.cache.clear?.();
        }
        // Try to abort any pending navigation
        if (
          routerInstance.pending &&
          routerInstance.pending instanceof AbortController
        ) {
          routerInstance.pending.abort();
        }
      }

      const nextFetchCache = (window as any).__nextFetchCache;
      if (nextFetchCache) {
        nextFetchCache.clear();
      }

      // Try to access Next.js router's promise queue and abort pending requests
      const routerInternals = (window as any).__nextRouterInternals;
      if (routerInternals?.promiseQueue) {
        // Clear promise queue
        if (typeof routerInternals.promiseQueue.clear === "function") {
          routerInternals.promiseQueue.clear();
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.debug(
          `🛑 [ABORT_REGISTRY] Force aborted ALL global requests including Next.js internal`
        );
      }
    } catch (e) {
      // Ignore errors - internal APIs might not exist
      if (process.env.NODE_ENV === "development") {
        console.warn(`⚠️ [ABORT_REGISTRY] Error in force abort:`, e);
      }
    }
  }
}

// Global singleton instance
export const abortRegistry =
  typeof window !== "undefined" ? new AbortRegistry() : null;

/**
 * Wrapper for fetch that automatically registers with abort registry
 */
export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { abortController?: AbortController }
): Promise<Response> {
  if (!abortRegistry) {
    return fetch(input, init);
  }

  // Use provided controller or create new one
  const controller = init?.abortController || new AbortController();
  abortRegistry.register(controller);

  try {
    const fetchPromise = fetch(input, {
      ...init,
      signal: controller.signal,
    });

    abortRegistry.registerPromise(controller, fetchPromise);

    const response = await fetchPromise;

    // Clean up after successful fetch
    abortRegistry.unregister(controller);

    return response;
  } catch (error) {
    // Clean up on error
    abortRegistry.unregister(controller);
    throw error;
  }
}
