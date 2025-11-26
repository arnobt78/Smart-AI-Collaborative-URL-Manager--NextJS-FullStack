import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById, updateList } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { requirePermission } from "@/lib/collaboration/permissions";
import { redis, cacheKeys } from "@/lib/redis";
import { fetchUrlMetadata } from "@/utils/urlMetadata";
import type { UrlItem } from "@/stores/urlListStore";
import type { UrlMetadata } from "@/utils/urlMetadata";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { urls, archivedUrls, action, urlId } = await req.json();

    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check edit permission
    try {
      await requirePermission(id, user.id, "edit");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // Get existing values from database
    // Handle case where archivedUrls might not exist in database yet (before migration)
    const existingUrls = Array.isArray(list.urls) ? list.urls : [];
    const existingArchivedUrls = Array.isArray((list as any).archivedUrls) 
      ? (list as any).archivedUrls 
      : [];

    const updatePayload: {
      urls?: any;
      archivedUrls?: any;
    } = {};

    if (urls !== undefined) {
      updatePayload.urls = urls;
    } else if (existingUrls.length > 0) {
      updatePayload.urls = existingUrls;
    }

    if (archivedUrls !== undefined) {
      updatePayload.archivedUrls = archivedUrls;
    } else {
      updatePayload.archivedUrls = existingArchivedUrls;
    }

    await updateList(id, updatePayload);

    const updatedList = await getListById(id);
    if (!updatedList) {
      return NextResponse.json({ error: "List not found after update" }, { status: 404 });
    }

    // Determine activity action based on operation type
    let activityAction: string | null = null;
    let activityDetails: any = null;
    let urlMetadata: UrlMetadata | undefined;

    if (action === "archive" && urlId) {
      // Archive action - find the archived URL to get details
      const archivedUrlsList = (updatedList.archivedUrls as unknown as UrlItem[]) || [];
      const archivedUrl = archivedUrlsList.find((u) => u.id === urlId);
      if (archivedUrl) {
        activityAction = "url_archived";
        activityDetails = {
          urlId: archivedUrl.id,
          url: archivedUrl.url,
          urlTitle: archivedUrl.title || archivedUrl.url,
        };
        // Get metadata from cache if available
        if (redis && archivedUrl.url) {
          try {
            const urlCacheKey = cacheKeys.urlMetadata(archivedUrl.url);
            urlMetadata = (await redis.get<UrlMetadata>(urlCacheKey)) || undefined;
          } catch {
            // Ignore Redis errors
          }
        }
      }
    } else if (action === "restore" && urlId) {
      // Restore action - find the restored URL to get details
      const restoredUrlsList = (updatedList.urls as unknown as UrlItem[]) || [];
      const restoredUrl = restoredUrlsList.find((u) => u.id === urlId);
      if (restoredUrl) {
        activityAction = "url_restored";
        activityDetails = {
          urlId: restoredUrl.id,
          url: restoredUrl.url,
          urlTitle: restoredUrl.title || restoredUrl.url,
        };
        // Get metadata from cache if available
        if (redis && restoredUrl.url) {
          try {
            const urlCacheKey = cacheKeys.urlMetadata(restoredUrl.url);
            urlMetadata = (await redis.get<UrlMetadata>(urlCacheKey)) || undefined;
            // If not in cache, fetch it and cache it
            if (!urlMetadata) {
              try {
                urlMetadata = await fetchUrlMetadata(restoredUrl.url);
                if (redis && urlMetadata) {
                  const urlCacheKey = cacheKeys.urlMetadata(restoredUrl.url);
                  await redis.set(urlCacheKey, urlMetadata, { ex: 86400 * 7 }); // 7 days TTL
                }
              } catch {
                // Ignore metadata fetch errors
              }
            }
          } catch {
            // Ignore Redis errors
          }
        }
      }
    }

    // Create activity if we have an action
    let activity = null;
    if (activityAction && activityDetails) {
      activity = await createActivity(id, user.id, activityAction, activityDetails);

      // Publish real-time updates (both list update and activity)
      await Promise.all([
        publishMessage(CHANNELS.listUpdate(id), {
          type: "list_updated",
          listId: id,
          action: activityAction,
          timestamp: new Date().toISOString(),
          urlCount: (updatedList.urls as unknown as UrlItem[]).length,
        }),
        publishMessage(CHANNELS.listActivity(id), {
          type: "activity_created",
          listId: id,
          action: activityAction,
          timestamp: new Date().toISOString(),
          activity: {
            id: activity.id,
            action: activity.action,
            details: activity.details,
            createdAt: activity.createdAt.toISOString(),
            user: activity.user ? {
              id: activity.user.id,
              email: activity.user.email,
            } : {
              id: user.id,
              email: user.email,
            },
          },
        }),
      ]);
    }

    // Invalidate cache
    if (redis) {
      try {
        await Promise.all([
          redis.del(cacheKeys.listMetadata(id)),
          redis.del(`list-urls:${id}`),
        ]);
      } catch (error) {
        // Ignore cache errors
      }
    }

    console.log(`✅ [ARCHIVE] ${action === "archive" ? "Archived" : "Restored"} URL: ${urlId || "unknown"}`);
    
    // Return unified response with activity data if available
    return NextResponse.json({
      list: updatedList,
      metadata: urlMetadata, // Include metadata if restored (for caching)
      activity: activity
        ? {
            id: activity.id,
            action: activityAction,
            details: activityDetails,
            createdAt: activity.createdAt,
            user: {
              id: user.id,
              email: user.email,
            },
          }
        : null,
    });
  } catch (error) {
    console.error("❌ [ARCHIVE] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update list";
    return NextResponse.json(
      { error: message, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
