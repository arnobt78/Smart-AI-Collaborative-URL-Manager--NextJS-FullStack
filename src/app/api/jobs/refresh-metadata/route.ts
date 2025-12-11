import { NextRequest, NextResponse } from "next/server";
import { getListById, updateList } from "@/lib/db";
import type { UrlItem } from "@/stores/urlListStore";
import { uploadExternalImage } from "@/lib/cloudinary-server";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/jobs/refresh-metadata
 * Refresh metadata for URLs in a specific list
 * Called by QStash scheduled jobs or manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listId } = body;

    if (!listId) {
      return NextResponse.json(
        { error: "List ID is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 [METADATA REFRESH] Starting metadata refresh for list ${listId}`);

    // Get the list
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const urls = (list.urls as unknown as UrlItem[]) || [];
    if (urls.length === 0) {
      console.log(`ℹ️ [METADATA REFRESH] No URLs to refresh in list ${listId}`);
      return NextResponse.json({
        success: true,
        message: "No URLs to refresh",
        refreshed: 0,
      });
    }

    console.log(`🔄 [METADATA REFRESH] Refreshing metadata for ${urls.length} URLs...`);

    const startTime = Date.now();
    const updatedUrls: UrlItem[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Refresh metadata for each URL (with concurrency limit)
    const concurrency = 3;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(async (urlItem) => {
        try {
          // Fetch metadata using the metadata API
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
          const metadataResponse = await fetch(
            `${baseUrl}/api/metadata?url=${encodeURIComponent(urlItem.url)}`
          );

          if (!metadataResponse.ok) {
            throw new Error(
              `Failed to fetch metadata: ${metadataResponse.status}`
            );
          }

          const metadata = await metadataResponse.json();

          // Update URL with new metadata (including images)
          const updatedUrl: UrlItem = {
            ...urlItem,
            title: metadata.title || urlItem.title || urlItem.url,
            description: metadata.description || urlItem.description || null,
            // Note: image is not stored in URL item, it's fetched on-the-fly via useUrlMetadata
            // The improved extractor will be used automatically on next render
            updatedAt: new Date().toISOString(),
          };

          successCount++;
          return updatedUrl;
        } catch (error) {
          console.error(
            `❌ [METADATA REFRESH] Error refreshing ${urlItem.url}:`,
            error
          );
          errorCount++;
          // Return original URL if refresh fails
          return urlItem;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      updatedUrls.push(...batchResults);

      // Small delay between batches
      if (i + concurrency < urls.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Update the list in database
    const updatedList = await updateList(listId, { urls: updatedUrls });

    const duration = Date.now() - startTime;
    console.log(
      `✅ [METADATA REFRESH] Completed in ${duration}ms - Success: ${successCount}, Errors: ${errorCount}`
    );

    // CRITICAL: Publish real-time updates so collaborators see metadata refresh immediately
    // Get user for activity log (if available - may be null for scheduled jobs)
    try {
      const user = await getCurrentUser();
      if (user) {
        // Create activity log
        const activity = await createActivity(listId, user.id, "metadata_refreshed", {
          refreshed: urls.length,
          success: successCount,
          errors: errorCount,
          duration,
        });

        // Publish real-time update
        await publishMessage(CHANNELS.listUpdate(listId), {
          type: "list_updated",
          listId,
          action: "metadata_refreshed",
          timestamp: new Date().toISOString(),
        });

        // Publish activity update
        await publishMessage(CHANNELS.listActivity(listId), {
          type: "activity_created",
          listId,
          action: "metadata_refreshed",
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
        });
      }
    } catch (error) {
      // Ignore errors if user not available (scheduled job case)
      // Still publish list update even without activity
      try {
        await publishMessage(CHANNELS.listUpdate(listId), {
          type: "list_updated",
          listId,
          action: "metadata_refreshed",
          timestamp: new Date().toISOString(),
        });
      } catch (publishError) {
        // Ignore publish errors - not critical
        console.error("❌ [METADATA REFRESH] Failed to publish SSE update:", publishError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Refreshed metadata for ${urls.length} URLs`,
      refreshed: urls.length,
      results: {
        success: successCount,
        errors: errorCount,
      },
      duration,
    });
  } catch (error) {
    console.error("❌ [METADATA REFRESH] Error:", error);
    const message =
      error instanceof Error ? error.message : "Metadata refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

