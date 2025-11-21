/**
 * Global abort registry to track and cancel all active fetch requests
 * This prevents navigation from getting stuck due to pending requests
 */

class AbortRegistry {
  private controllers: Set<AbortController> = new Set();
  private fetchMap: WeakMap<AbortController, Set<Promise<any>>> = new WeakMap();

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
   * Abort all registered controllers
   * CRITICAL: This prevents navigation from getting stuck
   */
  abortAll(): void {
    const count = this.controllers.size;
    if (process.env.NODE_ENV === "development" && count > 0) {
      console.debug(
        `🛑 [ABORT_REGISTRY] Aborting ${count} active request(s) to allow navigation`
      );
    }

    // Create a copy to avoid iteration issues during abort
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

    // Clear all controllers after aborting
    this.controllers.clear();
  }

  /**
   * Get count of active controllers
   */
  getCount(): number {
    return this.controllers.size;
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
