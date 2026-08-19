import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { UrlItem } from "@/stores/urlListStore";
import type { UrlMetadata } from "@/utils/urlMetadata";
import { fetchUrlMetadata } from "@/utils/urlMetadata";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import { metadataRefreshSchema, parseJsonBody } from "@/lib/api-validation";

type RouteContext = { params: Promise<{ id: string }> };
type AuthorizedListAccess = Extract<
  Awaited<ReturnType<typeof resolveAuthorizedList>>,
  { ok: true }
>;

/**
 * GET /api/lists/[id]/metadata
 * Unified endpoint that returns all metadata for all URLs in a list at once
 * Acts as a middleware/proxy layer with Redis caching
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext,
  authorizedAccess?: AuthorizedListAccess,
) {
  try {
    const params = await context.params;
    const access = authorizedAccess ?? await resolveAuthorizedList(params.id, "view");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const list = access.list;
    const listId = list.id;

    const urls = (list.urls as unknown as UrlItem[]) || [];
    if (urls.length === 0) {
      return NextResponse.json({ metadata: {} });
    }

    // Check Redis cache first (instant retrieval)
    const cacheKey = `list-metadata:${listId}`;
    const uniqueUrls = Array.from(new Set(urls.map((u) => u.url)));


    if (redis) {
      try {
        const cached = await redis.get<Record<string, UrlMetadata>>(cacheKey);
        if (cached) {
          // Check if cache is still valid (all URLs exist in cache)
          const allCached = uniqueUrls.every((url) => cached[url]);

          if (allCached) {
            // Cache is valid, return instantly
            return NextResponse.json({
              metadata: cached,
              cached: true,
            });
          } else {
            const _cachedUrls = Object.keys(cached);
            const _missingUrls = uniqueUrls.filter((url) => !cached[url]);
          }
        } else {
        }
      } catch (_error) {
      }
    } else {
    }

    // If not in cache or cache invalid, fetch all metadata
    const metadataMap: Record<string, UrlMetadata> = {};

    // Wrap the entire fetch operation in a timeout to prevent hanging
    const fetchWithTimeout = async () => {
      // Fetch metadata in parallel with concurrency limit
      const concurrency = 5;
      for (let i = 0; i < uniqueUrls.length; i += concurrency) {
        const batch = uniqueUrls.slice(i, i + concurrency);
        const batchPromises = batch.map(async (url) => {
          try {
            // Check if already fetched in this batch
            if (metadataMap[url]) {
              return;
            }

            // Check Redis cache for individual URL (might have been cached separately)
            if (redis) {
              try {
                const urlCacheKey = `url-metadata:${url}`;
                const cached = await redis.get<UrlMetadata>(urlCacheKey);
                if (cached) {
                  metadataMap[url] = cached;
                  return;
                }
              } catch {
                // Ignore Redis errors for individual URLs
              }
            }

            // Fetch metadata
            const metadata = await fetchUrlMetadata(url);
            metadataMap[url] = metadata;

            // Cache individual URL in Redis (for future use)
            if (redis) {
              try {
                const urlCacheKey = `url-metadata:${url}`;
                await redis.set(urlCacheKey, metadata, { ex: 86400 * 7 }); // 7 days TTL
              } catch {
                // Ignore Redis errors
              }
            }
          } catch (_error) {
            // Set empty metadata on error
            metadataMap[url] = {
              title: new URL(url).hostname.replace(/^www\./, ""),
              description: undefined,
              image: undefined,
              favicon: undefined,
              siteName: new URL(url).hostname.replace(/^www\./, ""),
            };
          }
        });

        await Promise.allSettled(batchPromises);
      }
    };

    // Race between fetch and 5-second timeout
    try {
      await Promise.race([
        fetchWithTimeout(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Metadata fetch timeout after 5 seconds")),
            5000
          )
        ),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        // Fill in fallback metadata for missing URLs
        uniqueUrls.forEach((url) => {
          if (!metadataMap[url]) {
            metadataMap[url] = {
              title: new URL(url).hostname.replace(/^www\./, ""),
              description: undefined,
              image: undefined,
              favicon: undefined,
              siteName: new URL(url).hostname.replace(/^www\./, ""),
            };
          }
        });
      }
    }

    // Cache the entire metadata map in Redis
    if (redis) {
      try {
        await redis.set(cacheKey, metadataMap, { ex: 86400 }); // 24 hours TTL
      } catch (_error) {
      }
    }

    return NextResponse.json({
      metadata: metadataMap,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/lists/[id]/metadata
 * Invalidate and refresh metadata cache for a list
 * Called when URLs are added/updated/deleted
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const parsed = await parseJsonBody(req, metadataRefreshSchema);
    if (!parsed.success) return parsed.response;
    const params = await context.params;
    const access = await resolveAuthorizedList(params.id, "edit");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const listId = access.list.id;

    // Invalidate cache
    const cacheKey = `list-metadata:${listId}`;
    if (redis) {
      try {
        await redis.del(cacheKey);
      } catch (_error) {
      }
    }

    // Optionally refresh metadata immediately
    if (parsed.data.refresh) {
      // Reuse the verified edit access rather than resolving the same list twice.
      const response = await GET(req, context, access);
      return response;
    }

    return NextResponse.json({
      success: true,
      message: "Cache invalidated",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to invalidate cache";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
