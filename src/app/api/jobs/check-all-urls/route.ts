import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateList } from "@/lib/db";
import type { UrlItem } from "@/stores/urlListStore";
import {
  checkUrlsHealth,
  updateUrlsWithHealthResults,
} from "@/lib/jobs/url-health";
import { isAuthorizedInternalJob } from "@/lib/jobs/authorization";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";

/**
 * POST /api/jobs/check-all-urls
 * Check health of URLs in all lists
 * Called by QStash daily cron job
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorizedInternalJob(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get all lists
    const lists = await prisma.list.findMany({
      select: {
        id: true,
        urls: true,
      },
    });

    let totalChecked = 0;
    let totalHealthy = 0;
    let totalWarning = 0;
    let totalBroken = 0;

    // Process each list
    for (const list of lists) {
      const urls = (list.urls as unknown as UrlItem[]) || [];
      if (urls.length === 0) continue;

      try {

        // Check health of all URLs in this list
        const healthResults = await checkUrlsHealth(urls, 5);

        // Update URLs with health results
        const updatedUrls = updateUrlsWithHealthResults(urls, healthResults);

        // Count results
        const healthyCount = updatedUrls.filter(
          (u) => u.healthStatus === "healthy"
        ).length;
        const warningCount = updatedUrls.filter(
          (u) => u.healthStatus === "warning"
        ).length;
        const brokenCount = updatedUrls.filter(
          (u) => u.healthStatus === "broken"
        ).length;

        // Update the list in database
        await updateList(list.id, { urls: updatedUrls });
        // Deliver scheduled health mutations through the same authorized SSE
        // cache synchronizer used by interactive mutations.
        await publishMessage(CHANNELS.listUpdate(list.id), {
          type: "list_updated",
          listId: list.id,
          eventKey: `job:${list.id}:health_check_completed:${Date.now()}`,
          action: "health_check_completed",
          timestamp: new Date().toISOString(),
        });

        totalChecked += urls.length;
        totalHealthy += healthyCount;
        totalWarning += warningCount;
        totalBroken += brokenCount;


        // Small delay between lists to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (_error) {
        // Continue with next list
      }
    }


    return NextResponse.json({
      success: true,
      message: `Checked ${totalChecked} URLs across ${lists.length} lists`,
      checked: totalChecked,
      lists: lists.length,
      results: {
        healthy: totalHealthy,
        warning: totalWarning,
        broken: totalBroken,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
