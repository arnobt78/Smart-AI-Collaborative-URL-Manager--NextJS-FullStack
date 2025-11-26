import { NextRequest, NextResponse } from "next/server";
import { getListById, updateList } from "@/lib/db";
import type { UrlItem } from "@/stores/urlListStore";
import {
  checkUrlsHealth,
  updateUrlsWithHealthResults,
} from "@/lib/jobs/url-health";
import { getCurrentUser } from "@/lib/auth";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";

/**
 * POST /api/jobs/check-urls
 * Check health of URLs in a specific list
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

    console.log(`🔍 [HEALTH CHECK] Starting health check for list ${listId}`);

    // Get the list
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const urls = (list.urls as unknown as UrlItem[]) || [];
    if (urls.length === 0) {
      console.log(`ℹ️ [HEALTH CHECK] No URLs to check in list ${listId}`);
      return NextResponse.json({
        success: true,
        message: "No URLs to check",
        checked: 0,
      });
    }

    console.log(`🔍 [HEALTH CHECK] Checking ${urls.length} URLs...`);

    // Check health of all URLs
    const startTime = Date.now();
    const healthResults = await checkUrlsHealth(urls, 5); // 5 concurrent checks
    const duration = Date.now() - startTime;

    // Update URLs with health results
    const updatedUrls = updateUrlsWithHealthResults(urls, healthResults);

    // Count results
    const healthyCount = updatedUrls.filter((u) => u.healthStatus === "healthy")
      .length;
    const warningCount = updatedUrls.filter((u) => u.healthStatus === "warning")
      .length;
    const brokenCount = updatedUrls.filter((u) => u.healthStatus === "broken")
      .length;

    // Update the list in database
    const updatedList = await updateList(listId, { urls: updatedUrls });

    // Get user for activity log (if available)
    try {
      const user = await getCurrentUser();
      if (user) {
        // Create activity log
        const activity = await createActivity(listId, user.id, "health_check_completed", {
          checked: urls.length,
          healthy: healthyCount,
          warning: warningCount,
          broken: brokenCount,
          duration,
        });

        // Publish real-time update
        await publishMessage(CHANNELS.listUpdate(listId), {
          type: "list_updated",
          listId,
          action: "health_check_completed",
          timestamp: new Date().toISOString(),
        });

        // Publish activity update
        await publishMessage(CHANNELS.listActivity(listId), {
          type: "activity_created",
          listId,
          action: "health_check_completed",
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
      // Don't fail health check if activity creation fails
      console.error("Failed to create health check activity:", error);
    }

    console.log(
      `✅ [HEALTH CHECK] Completed in ${duration}ms - Healthy: ${healthyCount}, Warning: ${warningCount}, Broken: ${brokenCount}`
    );

    return NextResponse.json({
      success: true,
      message: `Checked ${urls.length} URLs`,
      checked: urls.length,
      results: {
        healthy: healthyCount,
        warning: warningCount,
        broken: brokenCount,
      },
      duration,
      list: updatedList, // Return updated list for immediate UI update
    });
  } catch (error) {
    console.error("❌ [HEALTH CHECK] Error:", error);
    const message =
      error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

