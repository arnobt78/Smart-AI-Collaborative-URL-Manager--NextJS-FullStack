import type { UrlItem } from "@/stores/urlListStore";

export type HealthStatus = "healthy" | "warning" | "broken" | "unknown";

export interface HealthCheckResult {
  status: HealthStatus;
  httpStatus: number;
  responseTime: number;
  error?: string;
}

const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
const SLOW_RESPONSE_THRESHOLD = 3000; // 3 seconds

/**
 * Check the health of a single URL
 */
export async function checkUrlHealth(url: string): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(url, {
      method: "HEAD", // Use HEAD to minimize data transfer
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; UrllistHealthBot/1.0; +https://urlist.com)",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const statusCode = response.status;

    // Determine health status based on HTTP status code
    let status: HealthStatus;
    if (statusCode >= 200 && statusCode < 300) {
      // 2xx status codes = Healthy
      if (responseTime > SLOW_RESPONSE_THRESHOLD) {
        status = "warning"; // Slow but working
      } else {
        status = "healthy";
      }
    } else if (statusCode >= 300 && statusCode < 400) {
      // 3xx redirects = Warning (might be broken redirect chain)
      status = "warning";
    } else if (statusCode === 401 || statusCode === 403) {
      // Authentication/authorization errors = Warning (might be intentional)
      status = "warning";
    } else if (statusCode === 404 || statusCode >= 500) {
      // 404 or 5xx = Broken
      status = "broken";
    } else {
      // Other 4xx codes = Warning
      status = "warning";
    }

    return {
      status,
      httpStatus: statusCode,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Timeout or network errors = Broken
    return {
      status: "broken",
      httpStatus: 0,
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Check health for multiple URLs (with concurrency limit)
 */
export async function checkUrlsHealth(
  urls: UrlItem[],
  concurrency: number = 5
): Promise<Map<string, HealthCheckResult>> {
  const results = new Map<string, HealthCheckResult>();

  // Process URLs in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(async (urlItem) => {
      const result = await checkUrlHealth(urlItem.url);
      return { urlId: urlItem.id, result };
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ urlId, result }) => {
      results.set(urlId, result);
    });

    // Small delay between batches to avoid overwhelming servers
    if (i + concurrency < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Update URL items with health check results
 */
export function updateUrlsWithHealthResults(
  urls: UrlItem[],
  healthResults: Map<string, HealthCheckResult>
): UrlItem[] {
  const now = new Date().toISOString();

  return urls.map((url) => {
    const healthResult = healthResults.get(url.id);
    if (!healthResult) {
      return url; // No health check result, keep as is
    }

    return {
      ...url,
      healthStatus: healthResult.status,
      healthCheckedAt: now,
      healthLastStatus: healthResult.httpStatus,
      healthResponseTime: healthResult.responseTime,
      updatedAt: now,
    };
  });
}

