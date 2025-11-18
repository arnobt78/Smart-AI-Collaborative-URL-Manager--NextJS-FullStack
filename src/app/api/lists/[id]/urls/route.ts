import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById, updateList } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { deleteUrlVector, upsertUrlVectors, vectorIndex } from "@/lib/vector";
import { requirePermission } from "@/lib/collaboration/permissions";
import { redis, cacheKeys } from "@/lib/redis";
import { fetchUrlMetadata } from "@/utils/urlMetadata";
import type { UrlItem } from "@/stores/urlListStore";
import type { UrlMetadata } from "@/utils/urlMetadata";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/lists/[id]/urls
 * Unified endpoint to get all URLs with metadata (cached in Redis)
 * Acts as a middleware/proxy layer similar to the metadata endpoint
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const listId = params.id;

    // Get list from database
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user has access to this list (same logic as /api/lists/[id]/route.ts GET)
    // Allow access if:
    // 1. List is public (anyone can view)
    // 2. User owns the list
    // 3. User is a collaborator
    const hasAccess =
      list.isPublic ||
      (user &&
        (list.userId === user.id ||
          (list.collaborators && list.collaborators.includes(user.email))));

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urls = (list.urls as unknown as UrlItem[]) || [];

    // Check Redis cache for URLs with metadata
    const cacheKey = `list-urls:${listId}`;
    let cachedData: {
      urls: UrlItem[];
      metadata: Record<string, UrlMetadata>;
    } | null = null;

    if (redis) {
      try {
        const cached = await redis.get<{
          urls: UrlItem[];
          metadata: Record<string, UrlMetadata>;
          timestamp: number;
        }>(cacheKey);

        if (cached) {
          // Check if cache is still valid (compare URL IDs and count)
          const currentUrlIds = new Set(urls.map((u) => u.id).sort());
          const cachedUrlIds = new Set(
            (cached.urls || []).map((u) => u.id).sort()
          );

          const urlsMatch =
            currentUrlIds.size === cachedUrlIds.size &&
            [...currentUrlIds].every((id) => cachedUrlIds.has(id));

          if (urlsMatch && cached.metadata) {
            // Cache is valid, return instantly
            console.log(`✅ [GET] URLs with metadata loaded from cache`);
            return NextResponse.json({
              urls: cached.urls,
              metadata: cached.metadata,
              cached: true,
            });
          }
        }
      } catch (error) {
        // Ignore cache read errors
      }
    }

    // If not in cache or cache invalid, fetch metadata for all URLs
    const uniqueUrls = Array.from(new Set(urls.map((u) => u.url)));
    const metadataMap: Record<string, UrlMetadata> = {};

    // Check Redis cache for individual URL metadata first
    if (redis && uniqueUrls.length > 0) {
      for (const url of uniqueUrls) {
        try {
          const urlCacheKey = cacheKeys.urlMetadata(url);
          const cached = await redis.get<UrlMetadata>(urlCacheKey);
          if (cached) {
            metadataMap[url] = cached;
          }
        } catch {
          // Ignore Redis errors
        }
      }
    }

    // Fetch missing metadata
    const missingUrls = uniqueUrls.filter((url) => !metadataMap[url]);
    if (missingUrls.length > 0) {
      // Fetch metadata in parallel with concurrency limit
      const concurrency = 5;
      for (let i = 0; i < missingUrls.length; i += concurrency) {
        const batch = missingUrls.slice(i, i + concurrency);
        const batchPromises = batch.map(async (url) => {
          try {
            const metadata = await fetchUrlMetadata(url);
            metadataMap[url] = metadata;

            // Cache individual URL in Redis
            if (redis) {
              try {
                const urlCacheKey = cacheKeys.urlMetadata(url);
                await redis.set(urlCacheKey, metadata, { ex: 86400 * 7 }); // 7 days TTL
              } catch {
                // Ignore Redis errors
              }
            }
          } catch (error) {
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
    }

    // Cache the URLs with metadata in Redis
    if (redis) {
      try {
        await redis.set(
          cacheKey,
          {
            urls,
            metadata: metadataMap,
            timestamp: Date.now(),
          },
          { ex: 3600 }
        ); // 1 hour TTL
      } catch (error) {
        // Ignore cache errors
      }
    }

    console.log(`✅ [GET] URLs fetched and cached (${urls.length} URLs)`);
    return NextResponse.json({
      urls,
      metadata: metadataMap,
      cached: false,
    });
  } catch (error) {
    console.error("❌ [GET] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch URLs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/lists/[id]/urls
 * Unified endpoint to add a URL to a list
 * Handles metadata fetching, activity logging, real-time updates, and vector sync
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const listId = params.id;
    const body = await req.json();
    const {
      url,
      title,
      tags,
      notes,
      reminder,
      category,
      metadata,
    }: {
      url: string;
      title?: string;
      tags?: string[];
      notes?: string;
      reminder?: string;
      category?: string;
      metadata?: UrlMetadata;
    } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Get current list
    const currentList = await getListById(listId);
    if (!currentList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check edit permission
    try {
      await requirePermission(listId, user.id, "edit");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const currentUrls = (currentList.urls as unknown as UrlItem[]) || [];

    // Create new URL item
    const newUrl: UrlItem = {
      id: crypto.randomUUID(),
      url,
      title: title || metadata?.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      tags: tags || [],
      notes: notes || "",
      reminder,
      category: category || metadata?.siteName,
      clickCount: 0,
    };

    // Add URL to list
    const updatedUrls = [...currentUrls, newUrl];
    const updated = await updateList(listId, { urls: updatedUrls });

    // Use provided metadata if available (from cache), otherwise fetch it
    let finalMetadata = metadata as UrlMetadata | undefined;
    if (!finalMetadata) {
      try {
        // Check Redis cache first
        if (redis) {
          try {
            const urlCacheKey = cacheKeys.urlMetadata(url);
            const cached = await redis.get<UrlMetadata>(urlCacheKey);
            if (cached) {
              finalMetadata = cached;
              console.log(
                `✅ [POST] Using cached metadata from Redis for: ${url.slice(
                  0,
                  40
                )}...`
              );
            }
          } catch {
            // Ignore Redis errors
          }
        }

        // If not in cache, fetch from web
        if (!finalMetadata) {
          finalMetadata = await fetchUrlMetadata(url);
          // Cache metadata in Redis
          if (redis) {
            try {
              const urlCacheKey = cacheKeys.urlMetadata(url);
              await redis.set(urlCacheKey, finalMetadata, { ex: 86400 * 7 }); // 7 days TTL
            } catch {
              // Ignore Redis errors
            }
          }
        }
      } catch (error) {
        finalMetadata = {
          title: new URL(url).hostname.replace(/^www\./, ""),
          description: undefined,
          image: undefined,
          favicon: undefined,
          siteName: new URL(url).hostname.replace(/^www\./, ""),
        };
      }
    } else {
      console.log(
        `✅ [POST] Using provided metadata (from cache) for: ${url.slice(
          0,
          40
        )}...`
      );
    }

    // Prepare activity details
    const activityDetails = {
      urlId: newUrl.id,
      url: newUrl.url,
      urlTitle: newUrl.title || newUrl.url,
    };

    // Log activity
    const activity = await createActivity(
      listId,
      user.id,
      "url_added",
      activityDetails
    );

    // Publish real-time updates (both list update and activity)
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(listId), {
        type: "list_updated",
        listId: listId,
        action: "url_added",
        timestamp: new Date().toISOString(),
        urlCount: updatedUrls.length,
      }),
      publishMessage(CHANNELS.listActivity(listId), {
        type: "activity_created",
        listId: listId,
        action: "url_added",
        timestamp: new Date().toISOString(),
        activity,
      }),
    ]);

    // Invalidate cache
    if (redis) {
      try {
        await Promise.all([
          redis.del(cacheKeys.listMetadata(listId)),
          redis.del(`list-urls:${listId}`),
        ]);
      } catch (error) {
        // Ignore cache errors
      }
    }

    // Sync vectors in background (non-blocking)
    if (vectorIndex) {
      upsertUrlVectors([newUrl], listId).catch((error) => {
        // Ignore vector sync errors
      });
    }

    console.log(`✅ [POST] URL added: ${url}`);
    // Return unified response
    return NextResponse.json({
      success: true,
      list: updated,
      url: newUrl,
      metadata: finalMetadata,
      activity: {
        id: activity.id,
        action: "url_added",
        details: activityDetails,
        createdAt: activity.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ [POST] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/lists/[id]/urls
 * Unified endpoint to update a URL in a list
 * Handles activity logging, real-time updates, and cache invalidation
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const listId = params.id;
    const body = await req.json();
    const {
      urlId,
      updates,
    }: {
      urlId: string;
      updates: Partial<UrlItem>;
    } = body;

    if (!urlId || !updates) {
      return NextResponse.json(
        { error: "urlId and updates are required" },
        { status: 400 }
      );
    }

    // Get current list
    const currentList = await getListById(listId);
    if (!currentList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check edit permission
    try {
      await requirePermission(listId, user.id, "edit");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const currentUrls = (currentList.urls as unknown as UrlItem[]) || [];
    const urlToUpdate = currentUrls.find((u) => u.id === urlId);

    if (!urlToUpdate) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Update URL
    const updatedUrl: UrlItem = {
      ...urlToUpdate,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedUrls = currentUrls.map((u) =>
      u.id === urlId ? updatedUrl : u
    );
    const updated = await updateList(listId, { urls: updatedUrls });

    // Check if URL changed (need to fetch new metadata)
    const urlChanged = updates.url && updates.url !== urlToUpdate.url;

    // If URL changed, fetch metadata for the new URL
    let urlMetadata: UrlMetadata | undefined;
    if (urlChanged && updatedUrl.url) {
      try {
        // Check Redis cache first
        if (redis) {
          try {
            const urlCacheKey = cacheKeys.urlMetadata(updatedUrl.url);
            const cached = await redis.get<UrlMetadata>(urlCacheKey);
            if (cached) {
              urlMetadata = cached;
              console.log(
                `✅ [PATCH] Using cached metadata from Redis for: ${updatedUrl.url.slice(
                  0,
                  40
                )}...`
              );
            }
          } catch {
            // Ignore Redis errors
          }
        }

        // If not in cache, fetch from web
        if (!urlMetadata) {
          urlMetadata = await fetchUrlMetadata(updatedUrl.url);
          // Cache metadata in Redis
          if (redis) {
            try {
              const urlCacheKey = cacheKeys.urlMetadata(updatedUrl.url);
              await redis.set(urlCacheKey, urlMetadata, { ex: 86400 * 7 }); // 7 days TTL
            } catch {
              // Ignore Redis errors
            }
          }
        }
      } catch (error) {
        // Fallback metadata if fetch fails
        urlMetadata = {
          title: new URL(updatedUrl.url).hostname.replace(/^www\./, ""),
          description: undefined,
          image: undefined,
          favicon: undefined,
          siteName: new URL(updatedUrl.url).hostname.replace(/^www\./, ""),
        };
      }
    }

    // Prepare activity details
    const activityDetails = {
      urlId: updatedUrl.id,
      url: updatedUrl.url,
      urlTitle: updatedUrl.title || updatedUrl.url,
    };

    // Log activity
    const activity = await createActivity(
      listId,
      user.id,
      "url_updated",
      activityDetails
    );

    // Publish real-time updates (both list update and activity)
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(listId), {
        type: "list_updated",
        listId: listId,
        action: "url_updated",
        timestamp: new Date().toISOString(),
        urlCount: updatedUrls.length,
      }),
      publishMessage(CHANNELS.listActivity(listId), {
        type: "activity_created",
        listId: listId,
        action: "url_updated",
        timestamp: new Date().toISOString(),
        activity,
      }),
    ]);

    // Invalidate cache
    if (redis) {
      try {
        await Promise.all([
          redis.del(cacheKeys.listMetadata(listId)),
          redis.del(`list-urls:${listId}`),
        ]);
      } catch (error) {
        // Ignore cache errors
      }
    }

    // Sync vectors in background (non-blocking)
    if (vectorIndex) {
      upsertUrlVectors([updatedUrl], listId).catch((error) => {
        // Ignore vector sync errors
      });
    }

    console.log(`✅ [PATCH] URL updated: ${updatedUrl.url}`);
    // Return unified response
    return NextResponse.json({
      success: true,
      list: updated,
      url: updatedUrl,
      metadata: urlMetadata, // Include metadata if URL changed
      activity: {
        id: activity.id,
        action: "url_updated",
        details: activityDetails,
        createdAt: activity.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ [PATCH] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/lists/[id]/urls
 * Unified endpoint to delete a URL from a list
 * Handles activity logging, real-time updates, cache invalidation, and vector sync
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const listId = params.id;
    const body = await req.json().catch(() => ({}));
    const { urlId }: { urlId?: string } = body;

    // Support both query param and body for urlId (for backward compatibility)
    const searchParams = req.nextUrl.searchParams;
    const finalUrlId = urlId || searchParams.get("urlId");

    if (!finalUrlId) {
      return NextResponse.json({ error: "urlId is required" }, { status: 400 });
    }

    // Get current list
    const currentList = await getListById(listId);
    if (!currentList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check edit permission
    try {
      await requirePermission(listId, user.id, "edit");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const currentUrls = (currentList.urls as unknown as UrlItem[]) || [];
    const deletedUrl = currentUrls.find((u) => u.id === finalUrlId);

    if (!deletedUrl) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Remove URL from list
    const updatedUrls = currentUrls.filter((u) => u.id !== finalUrlId);
    const updated = await updateList(listId, { urls: updatedUrls });

    // Prepare activity details
    const activityDetails = {
      urlId: deletedUrl.id,
      url: deletedUrl.url,
      urlTitle: deletedUrl.title || deletedUrl.url,
      urlCount: updatedUrls.length,
    };

    // Log activity
    const activity = await createActivity(
      listId,
      user.id,
      "url_deleted",
      activityDetails
    );

    // Publish real-time updates (both list update and activity)
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(listId), {
        type: "list_updated",
        listId: listId,
        action: "url_deleted",
        timestamp: new Date().toISOString(),
        urlCount: updatedUrls.length,
      }),
      publishMessage(CHANNELS.listActivity(listId), {
        type: "activity_created",
        listId: listId,
        action: "url_deleted",
        timestamp: new Date().toISOString(),
        activity,
      }),
    ]);

    // Invalidate cache
    if (redis) {
      try {
        await Promise.all([
          redis.del(cacheKeys.listMetadata(listId)),
          redis.del(`list-urls:${listId}`),
        ]);
      } catch (error) {
        // Ignore cache errors
      }
    }

    // Sync vectors in background (non-blocking)
    if (vectorIndex) {
      deleteUrlVector(finalUrlId, listId).catch((error) => {
        // Ignore vector sync errors
      });
    }

    console.log(`✅ [DELETE] URL deleted: ${deletedUrl.url}`);
    // Return unified response
    return NextResponse.json({
      success: true,
      list: updated,
      activity: {
        id: activity.id,
        action: "url_deleted",
        details: activityDetails,
        createdAt: activity.createdAt,
      },
      deletedUrl: {
        id: deletedUrl.id,
        url: deletedUrl.url,
        title: deletedUrl.title,
      },
    });
  } catch (error) {
    console.error("❌ [DELETE] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
