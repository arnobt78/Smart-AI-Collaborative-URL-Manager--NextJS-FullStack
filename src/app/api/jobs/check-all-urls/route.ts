import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateList } from "@/lib/db";
import type { UrlItem } from "@/stores/urlListStore";
import {
  checkUrlsHealth,
  updateUrlsWithHealthResults,
} from "@/lib/jobs/url-health";

/**
 * POST /api/jobs/check-all-urls
 * Check health of URLs in all lists
 * Called by QStash daily cron job
 */
export async function POST(_request: NextRequest) {
  try {
    console.log("🔍 [HEALTH CHECK] Starting health check for all lists...");

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
        console.log(
          `🔍 [HEALTH CHECK] Checking ${urls.length} URLs in list ${list.id}`
        );

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

        totalChecked += urls.length;
        totalHealthy += healthyCount;
        totalWarning += warningCount;
        totalBroken += brokenCount;

        console.log(
          `✅ [HEALTH CHECK] List ${list.id} - Healthy: ${healthyCount}, Warning: ${warningCount}, Broken: ${brokenCount}`
        );

        // Small delay between lists to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ [HEALTH CHECK] Error checking list ${list.id}:`,
          error
        );
        // Continue with next list
      }
    }

    console.log(
      `✅ [HEALTH CHECK] Completed - Total: ${totalChecked}, Healthy: ${totalHealthy}, Warning: ${totalWarning}, Broken: ${totalBroken}`
    );

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
    console.error("❌ [HEALTH CHECK] Error:", error);
    const message =
      error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

