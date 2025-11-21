import { getBaseUrl } from "@/lib/utils";

export interface UrlMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

/**
 * Fetch URL metadata with timeout
 * @param url The URL to fetch metadata for
 * @param timeoutMs Timeout in milliseconds (default: 10 seconds)
 * @param abortSignal Optional AbortSignal to cancel the fetch
 */
export async function fetchUrlMetadata(
  url: string,
  timeoutMs?: number,
  abortSignal?: AbortSignal
): Promise<UrlMetadata> {
  const timeout = timeoutMs ?? 10000; // 10 seconds default - faster failure, less blocking
  let timeoutId: NodeJS.Timeout | undefined;
  let controller: AbortController | undefined;
  try {
    const baseUrl = getBaseUrl();

    // Create abort controller for timeout
    controller = new AbortController();

    // Register with global abort registry for cleanup
    if (typeof window !== "undefined") {
      try {
        const { abortRegistry } = await import("@/utils/abortRegistry");
        if (abortRegistry) {
          abortRegistry.register(controller);
        }
      } catch {
        // Ignore import errors - registry might not be available
      }
    }

    if (!controller) {
      return {};
    }

    // At this point, controller is guaranteed to be defined
    const safeController = controller;
    timeoutId = setTimeout(() => safeController.abort(), timeout);

    // Combine abort signals (external + timeout)
    if (abortSignal) {
      // If already aborted, abort immediately
      if (abortSignal.aborted || !controller) {
        clearTimeout(timeoutId);
        return {};
      }
      // Listen for abort and cancel timeout
      const abortHandler = () => {
        clearTimeout(timeoutId);
        controller?.abort();
      };
      abortSignal.addEventListener("abort", abortHandler);
      // Clean up listener when request completes
      const cleanup = () => {
        abortSignal.removeEventListener("abort", abortHandler);
      };
      // Store cleanup function to call later
      (controller.signal as any)._cleanup = cleanup;
    }

    try {
      const response = await fetch(
        `${baseUrl}/api/metadata?url=${encodeURIComponent(url)}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Clean up abort listener if it exists
      if ((controller.signal as any)?._cleanup) {
        (controller.signal as any)._cleanup();
      }

      // Unregister from abort registry after successful fetch
      if (typeof window !== "undefined") {
        try {
          const { abortRegistry } = await import("@/utils/abortRegistry");
          if (abortRegistry) {
            abortRegistry.unregister(controller);
          }
        } catch {
          // Ignore import errors
        }
      }

      if (!response.ok) {
        // Don't throw error - return empty object so caller can use imported data
        // This is expected behavior for inaccessible/broken URLs
        return {};
      }

      const metadata = await response.json();

      // Return empty object if metadata has error field (indicating fetch failure)
      if (metadata.error) {
        return {};
      }

      // Clean HTML entities from metadata fields
      const cleanText = (text?: string): string | undefined => {
        if (!text) return undefined;
        // Decode HTML entities
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        const decoded = textarea.value || text;
        // Remove HTML tags
        const cleaned = decoded.replace(/<[^>]*>/g, "").trim();
        return cleaned || undefined;
      };

      return {
        title: cleanText(metadata.title),
        description: cleanText(metadata.description),
        image: metadata.image,
        favicon: metadata.favicon,
        siteName: cleanText(metadata.siteName),
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Clean up abort listener if it exists
      if ((controller.signal as any)?._cleanup) {
        (controller.signal as any)._cleanup();
      }

      // Unregister from abort registry on error
      if (typeof window !== "undefined") {
        try {
          const { abortRegistry } = await import("@/utils/abortRegistry");
          if (abortRegistry) {
            abortRegistry.unregister(controller);
          }
        } catch {
          // Ignore import errors
        }
      }

      // If aborted due to timeout, it's expected - just return empty
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        if (process.env.NODE_ENV === "development") {
          console.debug(`Metadata fetch cancelled/timeout for: ${url}`);
        }
        return {};
      }
      throw fetchError;
    }
  } catch (error) {
    // Clean up timeout if it exists
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    // Unregister from abort registry on outer catch
    if (typeof window !== "undefined") {
      try {
        const { abortRegistry } = await import("@/utils/abortRegistry");
        if (abortRegistry && controller) {
          abortRegistry.unregister(controller);
        }
      } catch {
        // Ignore import errors
      }
    }

    // Silently return empty object - metadata fetch failure is not critical
    // Caller will use imported data instead
    // Only log in development for debugging
    if (process.env.NODE_ENV === "development") {
      // Suppress error logging - it's expected for inaccessible URLs
      // Uncomment for debugging: console.debug('Metadata fetch failed:', url, error);
    }
    return {};
  }
}
