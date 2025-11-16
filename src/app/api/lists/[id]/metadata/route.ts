import { NextRequest, NextResponse } from "next/server";
import { getListById } from "@/lib/db";
import { redis } from "@/lib/redis";
import type { UrlItem } from "@/stores/urlListStore";
import type { UrlMetadata } from "@/utils/urlMetadata";
import { fetchUrlMetadata } from "@/utils/urlMetadata";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/lists/[id]/metadata
 * Unified endpoint that returns all metadata for all URLs in a list at once
 * Acts as a middleware/proxy layer with Redis caching
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const listId = params.id;

    // Get list from database
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const urls = (list.urls as unknown as UrlItem[]) || [];
    if (urls.length === 0) {
      return NextResponse.json({ metadata: {} });
    }

    // Check Redis cache first (instant retrieval)
    const cacheKey = `list-metadata:${listId}`;
    let cachedMetadata: Record<string, UrlMetadata> | null = null;
    const uniqueUrls = Array.from(new Set(urls.map((u) => u.url)));

    console.log(`🔍 [SERVER] Checking Redis cache for list ${listId} (${uniqueUrls.length} unique URLs)`);

    if (redis) {
      try {
        const cached = await redis.get<Record<string, UrlMetadata>>(cacheKey);
        if (cached) {
          // Check if cache is still valid (all URLs exist in cache)
          const allCached = uniqueUrls.every((url) => cached[url]);
          
          if (allCached) {
            // Cache is valid, return instantly
            console.log(`⚡ [SERVER CACHE HIT] All ${uniqueUrls.length} URLs found in Redis cache, returning instantly`);
            return NextResponse.json({ 
              metadata: cached,
              cached: true,
            });
          } else {
            const cachedUrls = Object.keys(cached);
            const missingUrls = uniqueUrls.filter(url => !cached[url]);
            console.log(`⚠️ [SERVER CACHE PARTIAL] Only ${cachedUrls.length}/${uniqueUrls.length} URLs cached, missing: ${missingUrls.length} URLs`);
          }
        } else {
          console.log(`❌ [SERVER CACHE MISS] No cache found in Redis for list ${listId}`);
        }
      } catch (error) {
        console.warn(`⚠️ [SERVER] Redis cache read failed (non-critical):`, error);
      }
    } else {
      console.log(`⚠️ [SERVER] Redis not available, fetching all metadata from web`);
    }

    // If not in cache or cache invalid, fetch all metadata
    console.log(`🔄 [SERVER] Fetching metadata for ${uniqueUrls.length} URLs from web...`);
    const metadataMap: Record<string, UrlMetadata> = {};

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
                console.log(`  ✅ [SERVER] URL cache HIT: ${url.slice(0, 40)}...`);
                metadataMap[url] = cached;
                return;
              }
            } catch {
              // Ignore Redis errors for individual URLs
            }
          }

          // Fetch metadata
          console.log(`  🔄 [SERVER] Fetching: ${url.slice(0, 40)}...`);
          const metadata = await fetchUrlMetadata(url);
          metadataMap[url] = metadata;
          console.log(`  ✅ [SERVER] Fetched: ${url.slice(0, 40)}... (title: ${metadata.title?.slice(0, 30) || 'N/A'})`);

          // Cache individual URL in Redis (for future use)
          if (redis) {
            try {
              const urlCacheKey = `url-metadata:${url}`;
              await redis.set(urlCacheKey, metadata, { ex: 86400 * 7 }); // 7 days TTL
            } catch {
              // Ignore Redis errors
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch metadata for ${url}:`, error);
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

    // Cache the entire metadata map in Redis
    if (redis) {
      try {
        await redis.set(cacheKey, metadataMap, { ex: 86400 }); // 24 hours TTL
        console.log(`💾 [SERVER] Cached all ${Object.keys(metadataMap).length} metadata entries in Redis (24h TTL)`);
      } catch (error) {
        console.warn(`⚠️ [SERVER] Failed to cache metadata in Redis:`, error);
      }
    }

    console.log(`✅ [SERVER] Returning ${Object.keys(metadataMap).length} metadata entries (cached: false)`);
    return NextResponse.json({ 
      metadata: metadataMap,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching list metadata:", error);
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
    const params = await context.params;
    const listId = params.id;

    // Invalidate cache
    const cacheKey = `list-metadata:${listId}`;
    if (redis) {
      try {
        await redis.del(cacheKey);
      } catch (error) {
        console.warn("Failed to invalidate cache:", error);
      }
    }

    // Optionally refresh metadata immediately
    const body = await req.json().catch(() => ({}));
    if (body.refresh) {
      // Trigger refresh by calling GET endpoint logic
      const response = await GET(req, context);
      return response;
    }

    return NextResponse.json({ 
      success: true,
      message: "Cache invalidated",
    });
  } catch (error) {
    console.error("Error invalidating metadata cache:", error);
    const message =
      error instanceof Error ? error.message : "Failed to invalidate cache";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

