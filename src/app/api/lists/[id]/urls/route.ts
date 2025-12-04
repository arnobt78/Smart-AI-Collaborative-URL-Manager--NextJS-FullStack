import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlugOrId, updateList } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { hasListAccess } from "@/lib/collaboration/permissions";
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
    const identifier = params.id; // Can be slug or UUID

    // Get list from database (supports both slug and UUID)
    const list = await getListBySlugOrId(identifier);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for cache keys and permissions (always UUID)
    const listId = list.id;

    // Check if user has access to this list (validates role-based system and removes old collaborators)
    const hasAccess = await hasListAccess(list, user);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urls = (list.urls as unknown as UrlItem[]) || [];

    // Check Redis cache for URLs with metadata (use list.id, not identifier)
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
            if (process.env.NODE_ENV === "development") {
              console.log(`✅ [GET] URLs with metadata loaded from cache`);
            }
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

    if (process.env.NODE_ENV === "development") {
      console.log(`✅ [GET] URLs fetched and cached (${urls.length} URLs)`);
    }
    return NextResponse.json({
      urls,
      metadata: metadataMap,
      cached: false,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ [GET] Error:", error);
    }
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
    const identifier = params.id; // Can be slug or UUID
    const body = await req.json();
    const {
      url,
      title,
      tags,
      notes,
      reminder,
      category,
      metadata,
      isDuplicate,
    }: {
      url: string;
      title?: string;
      tags?: string[];
      notes?: string;
      reminder?: string;
      category?: string;
      metadata?: UrlMetadata;
      isDuplicate?: boolean;
    } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Get current list (supports both slug and UUID)
    const currentList = await getListBySlugOrId(identifier);
    if (!currentList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for permissions and cache keys (always UUID)
    const listId = currentList.id;

    // Check edit permission
    try {
      await requirePermission(listId, user.id, "edit");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const currentUrls = (currentList.urls as unknown as UrlItem[]) || [];

    // Create new URL item with position (at the end)
    const maxPosition = currentUrls.reduce((max, u) => {
      const pos = u.position ?? 0;
      return pos > max ? pos : max;
    }, -1);

    // Create new URL object with all metadata fields saved to database
    // This ensures metadata (title, description, category) persists after page refresh
    // Image and favicon are stored separately in Redis metadata cache and fetched on-demand
    const newUrl: UrlItem = {
      id: crypto.randomUUID(),
      url,
      // Title: user-provided or from metadata (saved to DB, persists after refresh)
      title: title || metadata?.title,
      // Description: from metadata (saved to DB, persists after refresh)
      description: metadata?.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      // User-provided fields
      tags: tags || [],
      notes: notes || "",
      reminder,
      // Category: user-provided or from metadata.siteName (saved to DB)
      category: category || metadata?.siteName,
      clickCount: 0,
      position: maxPosition + 1, // Add at the end
    };

    // Add URL to list and sort by position
    const updatedUrls = [...currentUrls, newUrl].sort(
      (a, b) => (a.position ?? 999) - (b.position ?? 999)
    );
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
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `✅ [POST] Using cached metadata from Redis for: ${url.slice(
                    0,
                    40
                  )}...`
                );
              }
            }
          } catch {
            // Ignore Redis errors
          }
        }

        // If not in cache, return fallback immediately and fetch metadata in background
        // CRITICAL: This makes the POST endpoint return FAST (<100ms) instead of waiting
        if (!finalMetadata) {
          // Use fallback metadata immediately to return fast
          finalMetadata = {
            title: new URL(url).hostname.replace(/^www\./, ""),
            description: undefined,
            image: undefined,
            favicon: undefined,
            siteName: new URL(url).hostname.replace(/^www\./, ""),
          };

          // Fetch metadata in background (non-blocking) - don't await
          // This allows the POST request to return immediately (<100ms) while metadata is fetched
          // Metadata will be cached for future requests and URL object will be updated
          Promise.resolve().then(async () => {
            try {
              // Fetch metadata with longer timeout for background fetch (5 seconds)
              const metadata = await Promise.race([
                fetchUrlMetadata(url, 5000).catch(() => ({} as UrlMetadata)),
                new Promise<UrlMetadata>((resolve) => {
                  setTimeout(() => resolve({} as UrlMetadata), 5000);
                }),
              ]);

              // If we got actual metadata with useful fields, cache it and update URL object
              if (metadata && Object.keys(metadata).length > 0) {
                // Cache in Redis for unified endpoint
                if (redis) {
                  try {
                    const urlCacheKey = cacheKeys.urlMetadata(url);
                    await redis.set(urlCacheKey, metadata, { ex: 86400 * 7 }); // 7 days TTL
                  } catch {
                    // Ignore Redis errors
                  }
                }

                // Update URL object in database with metadata if we got better data
                // Only update if we have new/better information
                const needsUpdate =
                  (metadata.title && !newUrl.title) ||
                  (metadata.description && !newUrl.description) ||
                  (metadata.siteName && !newUrl.category);

                if (needsUpdate) {
                  try {
                    const refreshedList = await getListBySlugOrId(identifier);
                    if (refreshedList) {
                      const currentUrls =
                        (refreshedList.urls as unknown as UrlItem[]) || [];
                      const urlToUpdate = currentUrls.find(
                        (u) => u.id === newUrl.id
                      );

                      if (urlToUpdate) {
                        // Update URL object with metadata fields
                        const updatedUrl: UrlItem = {
                          ...urlToUpdate,
                          title: metadata.title || urlToUpdate.title,
                          description:
                            metadata.description || urlToUpdate.description,
                          category: metadata.siteName || urlToUpdate.category,
                          updatedAt: new Date().toISOString(),
                        };

                        // Update in database (use refreshedList.id, always UUID)
                        const updatedUrls = currentUrls.map((u) =>
                          u.id === newUrl.id ? updatedUrl : u
                        );
                        await updateList(refreshedList.id, {
                          urls: updatedUrls,
                        });

                        // Invalidate list metadata cache so unified endpoint refetches
                        if (redis) {
                          try {
                            await redis.del(
                              cacheKeys.listMetadata(refreshedList.id)
                            );
                          } catch {
                            // Ignore Redis errors
                          }
                        }
                      }
                    }
                  } catch (error) {
                    // Silently fail - metadata is cached, that's the main thing
                    if (process.env.NODE_ENV === "development") {
                      console.warn(
                        "Failed to update URL object with background metadata:",
                        error
                      );
                    }
                  }
                }
              }
            } catch {
              // Silently fail - we already have fallback metadata
            }
          });
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
      if (process.env.NODE_ENV === "development") {
        console.log(
          `✅ [POST] Using provided metadata (from cache) for: ${url.slice(
            0,
            40
          )}...`
        );
      }

      // CRITICAL: Cache provided metadata in Redis for unified endpoint
      // This ensures metadata is available for the batch metadata endpoint
      if (redis && finalMetadata) {
        try {
          const urlCacheKey = cacheKeys.urlMetadata(url);
          await redis.set(urlCacheKey, finalMetadata, { ex: 86400 * 7 }); // 7 days TTL

          // Also update the URL object with metadata fields if they're better
          if (finalMetadata.title && !newUrl.title) {
            newUrl.title = finalMetadata.title;
          }
          if (finalMetadata.description && !newUrl.description) {
            newUrl.description = finalMetadata.description;
          }
          if (finalMetadata.siteName && !newUrl.category) {
            newUrl.category = finalMetadata.siteName;
          }
        } catch (error) {
          // Ignore Redis errors (non-critical)
          if (process.env.NODE_ENV === "development") {
            console.warn("Failed to cache provided metadata:", error);
          }
        }
      }
    }

    // Determine activity action based on whether this is a duplicate
    const activityAction = isDuplicate ? "url_duplicated" : "url_added";

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
      activityAction,
      activityDetails
    );

    // Publish real-time updates (both list update and activity)
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(listId), {
        type: "list_updated",
        listId: listId,
        action: activityAction, // Use activityAction so reorder publishes as "url_reordered"
        timestamp: new Date().toISOString(),
        urlCount: updatedUrls.length,
      }),
      publishMessage(CHANNELS.listActivity(listId), {
        type: "activity_created",
        listId: listId,
        action: activityAction,
        timestamp: new Date().toISOString(),
        activity: {
          id: activity.id,
          action: activity.action,
          details: activity.details,
          createdAt: activity.createdAt.toISOString(),
          user: activity.user
            ? {
                id: activity.user.id,
                email: activity.user.email,
              }
            : {
                id: user.id,
                email: user.email,
              },
        },
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

    if (process.env.NODE_ENV === "development") {
      console.log(
        `✅ [POST] URL added: ${url}${isDuplicate ? " (duplicated)" : ""}`
      );
    }
    // Return unified response
    return NextResponse.json({
      success: true,
      list: updated,
      url: newUrl,
      metadata: finalMetadata,
      activity: {
        id: activity.id,
        action: activityAction,
        details: activityDetails,
        createdAt: activity.createdAt,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ [POST] Error:", error);
    }
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
    const identifier = params.id; // Can be slug or UUID
    const body = await req.json();
    const {
      urlId,
      updates,
      urls: reorderedUrls, // For reorder operation
      action: requestAction, // Optional action (e.g., "reorder")
      metadata: providedMetadata,
    }: {
      urlId?: string;
      updates?: Partial<UrlItem>;
      urls?: UrlItem[]; // For reorder operation
      action?: string;
      metadata?: UrlMetadata;
    } = body;

    // Get current list (supports both slug and UUID)
    const currentList = await getListBySlugOrId(identifier);
    if (!currentList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for permissions and cache keys (always UUID)
    const listId = currentList.id;

    // Log what we received from client
    if (reorderedUrls && Array.isArray(reorderedUrls)) {
      const receivedOrder = reorderedUrls.map((u: UrlItem) => u.id).join(",");
      console.log(`📥 [PATCH] Received reorder request`, {
        listId: listId,
        receivedOrder: receivedOrder,
        urlCount: reorderedUrls.length,
        action: requestAction,
      });
    }

    // Support both single URL update and bulk reorder
    const isReorderOperation =
      requestAction === "reorder" ||
      (reorderedUrls && Array.isArray(reorderedUrls));

    if (isReorderOperation) {
      // Reorder operation - use reorderedUrls
      if (!reorderedUrls || !Array.isArray(reorderedUrls)) {
        return NextResponse.json(
          { error: "urls array is required for reorder operation" },
          { status: 400 }
        );
      }
    } else {
      // Single URL update - use urlId and updates
      if (!urlId || !updates) {
        return NextResponse.json(
          { error: "urlId and updates are required for update operation" },
          { status: 400 }
        );
      }
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

    let updated: any;
    let updatedUrls: UrlItem[];
    let updatedUrl: UrlItem | undefined;

    if (isReorderOperation) {
      // Reorder operation - use position-based system instead of array reordering
      // This is much simpler and more reliable!

      // If reorderedUrls is provided, extract position from each URL
      // Create a map of URL ID to position
      const positionMap = new Map<string, number>();
      reorderedUrls!.forEach((url: UrlItem, index: number) => {
        positionMap.set(url.id, index);
      });

      // Update positions in existing URLs array (preserve all other data)
      updatedUrls = currentUrls.map((url) => {
        const newPosition = positionMap.get(url.id);
        if (newPosition !== undefined) {
          return { ...url, position: newPosition };
        }
        return url;
      });

      // Sort by position for consistent storage
      updatedUrls.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

      const orderToSave = updatedUrls.map((u) => u.id).join(",");
      console.log(`💾 [PATCH] Updating positions`, {
        listId: listId,
        orderToSave: orderToSave,
        urlCount: updatedUrls.length,
      });

      updated = await updateList(listId, { urls: updatedUrls });

      const savedUrls = (updated.urls as unknown as UrlItem[]) || [];
      const savedOrder = savedUrls.map((u) => u.id).join(",");
      console.log(`✅ [PATCH] Positions updated`, {
        listId: listId,
        savedOrder: savedOrder,
        matchesSent: savedOrder === orderToSave,
      });

      // For reorder, we don't have a single updatedUrl, so set to undefined
      updatedUrl = undefined;
    } else {
      // Single URL update operation
      const urlToUpdate = currentUrls.find((u) => u.id === urlId);

      if (!urlToUpdate) {
        return NextResponse.json({ error: "URL not found" }, { status: 404 });
      }

      // Update URL
      const updatedUrlItem: UrlItem = {
        ...urlToUpdate,
        ...updates!,
        updatedAt: new Date().toISOString(),
      };

      updatedUrl = updatedUrlItem; // Set for later use
      updatedUrls = currentUrls.map((u) =>
        u.id === urlId ? updatedUrlItem : u
      );
      updated = await updateList(listId, { urls: updatedUrls });
    }

    // Check if URL changed (need to fetch new metadata) - only for single URL update
    const urlChanged =
      !isReorderOperation &&
      updates?.url &&
      updatedUrl &&
      currentUrls.find((u) => u.id === urlId)?.url !== updatedUrl.url;

    // If URL changed, fetch metadata for the new URL
    let urlMetadata: UrlMetadata | undefined;
    if (!isReorderOperation && urlChanged && updatedUrl?.url) {
      try {
        // Priority 1: Use provided metadata from client (from prefetch cache)
        if (providedMetadata) {
          urlMetadata = providedMetadata;
          console.log(
            `✅ [PATCH] Using provided metadata (from prefetch cache) for: ${updatedUrl.url.slice(
              0,
              40
            )}...`
          );

          // Also cache it in Redis for future requests
          if (redis) {
            try {
              const urlCacheKey = cacheKeys.urlMetadata(updatedUrl.url);
              await redis.set(urlCacheKey, urlMetadata, { ex: 86400 * 7 }); // 7 days TTL
            } catch {
              // Ignore Redis errors
            }
          }
        } else {
          // Priority 2: Check Redis cache
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

          // Priority 3: If not in cache, fetch from web
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

      // After fetching metadata (if URL changed), merge metadata fields into the URL object
      // This ensures title, description, and category are saved to the database
      if (urlMetadata && updatedUrl) {
        const updatedUrlWithMetadata: UrlItem = {
          ...updatedUrl,
          // Update title from metadata if not manually provided in updates
          title: updatedUrl.title || urlMetadata.title || updatedUrl.title,
          // Update description from metadata
          description:
            urlMetadata.description || updatedUrl.description || undefined,
          // Update category from metadata siteName if not manually provided
          category:
            updatedUrl.category ||
            urlMetadata.siteName ||
            updatedUrl.category ||
            undefined,
          updatedAt: new Date().toISOString(),
        };

        // Update the URLs array with the merged metadata
        updatedUrls = updatedUrls.map((u) =>
          u.id === urlId ? updatedUrlWithMetadata : u
        );
        updated = await updateList(listId, { urls: updatedUrls });
        updatedUrl = updatedUrlWithMetadata; // Update reference for activity logging
      }
    }

    // Detect what changed to create appropriate activity
    let activityAction = "url_updated";
    let activityDetails: Record<string, unknown> = {};

    if (isReorderOperation) {
      // Reorder operation - create url_reordered activity
      activityAction = "url_reordered";
      activityDetails = { urlCount: updatedUrls.length };
    } else if (updatedUrl) {
      // Single URL update operation
      const urlToUpdate = currentUrls.find((u) => u.id === urlId)!;
      const isFavoriteToggled =
        "isFavorite" in updates! &&
        urlToUpdate.isFavorite !== updatedUrl.isFavorite;
      const isPinToggled =
        "isPinned" in updates! && urlToUpdate.isPinned !== updatedUrl.isPinned;
      const isOnlyFavoriteChange =
        isFavoriteToggled &&
        Object.keys(updates!).length === 1 &&
        Object.keys(updates!).includes("isFavorite");
      const isOnlyPinChange =
        isPinToggled &&
        Object.keys(updates!).length === 1 &&
        Object.keys(updates!).includes("isPinned");

      // Determine activity action based on what changed
      if (isOnlyFavoriteChange) {
        activityAction = updatedUrl.isFavorite
          ? "url_favorited"
          : "url_unfavorited";
      } else if (isOnlyPinChange) {
        activityAction = updatedUrl.isPinned ? "url_pinned" : "url_unpinned";
      }

      // Prepare activity details
      activityDetails = {
        urlId: updatedUrl.id,
        url: updatedUrl.url,
        urlTitle: updatedUrl.title || updatedUrl.url,
      };
    }

    // Log activity
    const activity = await createActivity(
      listId,
      user.id,
      activityAction,
      activityDetails
    );

    // Publish real-time updates (both list update and activity)
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(listId), {
        type: "list_updated",
        listId: listId,
        action: activityAction || "url_updated", // Use activityAction if available (e.g., "url_reordered", "url_favorited")
        timestamp: new Date().toISOString(),
        urlCount: updatedUrls.length,
      }),
      publishMessage(CHANNELS.listActivity(listId), {
        type: "activity_created",
        listId: listId,
        action: activityAction,
        timestamp: new Date().toISOString(),
        activity: {
          id: activity.id,
          action: activity.action,
          details: activity.details,
          createdAt: activity.createdAt.toISOString(),
          user: activity.user
            ? {
                id: activity.user.id,
                email: activity.user.email,
              }
            : {
                id: user.id,
                email: user.email,
              },
        },
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
      if (isReorderOperation) {
        // For reorder, sync all URLs
        upsertUrlVectors(updatedUrls, listId).catch((error) => {
          console.error("❌ [VECTOR] Failed to sync URLs to vector DB:", error);
        });
      } else if (updatedUrl) {
        // For single URL update, sync only that URL
        upsertUrlVectors([updatedUrl], listId).catch((error) => {
          // Ignore vector sync errors
        });
      }
    }

    if (isReorderOperation) {
      const savedOrder =
        (updated.urls as unknown as UrlItem[])?.map((u: UrlItem) => u.id) || [];
      console.log(`✅ [PATCH] URLs reordered (action: ${activityAction})`, {
        savedOrder: savedOrder.join(","),
        urlCount: savedOrder.length,
        listId: listId,
      });
      // Return unified response for reorder
      return NextResponse.json({
        success: true,
        list: updated,
        activity: {
          id: activity.id,
          action: activityAction,
          details: activityDetails,
          createdAt: activity.createdAt,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      });
    } else {
      console.log(
        `✅ [PATCH] URL updated: ${updatedUrl?.url} (action: ${activityAction})`
      );
      // Return unified response for single URL update
      return NextResponse.json({
        success: true,
        list: updated,
        url: updatedUrl,
        metadata: urlMetadata, // Include metadata if URL changed
        activity: {
          id: activity.id,
          action: activityAction,
          details: activityDetails,
          createdAt: activity.createdAt,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      });
    }
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
    const identifier = params.id; // Can be slug or UUID
    const body = await req.json().catch(() => ({}));
    const { urlId }: { urlId?: string } = body;

    // Support both query param and body for urlId (for backward compatibility)
    const searchParams = req.nextUrl.searchParams;
    const finalUrlId = urlId || searchParams.get("urlId");

    if (!finalUrlId) {
      return NextResponse.json({ error: "urlId is required" }, { status: 400 });
    }

    // Get current list (supports both slug and UUID)
    const currentList = await getListBySlugOrId(identifier);
    if (!currentList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for permissions and cache keys (always UUID)
    const listId = currentList.id;

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
        activity: {
          id: activity.id,
          action: activity.action,
          details: activity.details,
          createdAt: activity.createdAt.toISOString(),
          user: activity.user
            ? {
                id: activity.user.id,
                email: activity.user.email,
              }
            : {
                id: user.id,
                email: user.email,
              },
        },
      }),
    ]);

    // Invalidate cache (including collections cache)
    if (redis) {
      try {
        await Promise.all([
          redis.del(cacheKeys.listMetadata(listId)),
          redis.del(`list-urls:${listId}`),
          // Clear collections cache so duplicate detection and suggestions refresh
          redis.del(`collections:suggestions:${listId}`),
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
