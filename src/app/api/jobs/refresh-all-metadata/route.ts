import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateList } from "@/lib/db";
import type { UrlItem } from "@/stores/urlListStore";
import { isAuthorizedInternalJob } from "@/lib/jobs/authorization";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";

/**
 * POST /api/jobs/refresh-all-metadata
 * Refresh metadata for URLs in all lists
 * Called by QStash weekly cron job
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

    let totalRefreshed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Process each list
    for (const list of lists) {
      const urls = (list.urls as unknown as UrlItem[]) || [];
      if (urls.length === 0) continue;

      try {

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
              const metadataResponse = await fetch(
                `${baseUrl}/api/metadata?url=${encodeURIComponent(urlItem.url)}`
              );

              if (!metadataResponse.ok) {
                throw new Error(
                  `Failed to fetch metadata: ${metadataResponse.status}`
                );
              }

              const metadata = await metadataResponse.json();

              // Update URL with new metadata
              const updatedUrl: UrlItem = {
                ...urlItem,
                title: metadata.title || urlItem.title,
                description: metadata.description || urlItem.description,
                updatedAt: new Date().toISOString(),
              };

              successCount++;
              return updatedUrl;
            } catch (_error) {
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
        await updateList(list.id, { urls: updatedUrls });
        // The authenticated SSE route re-authorizes subscribers and attaches
        // the current server list before delivery. Publishing here ensures
        // scheduled mutations take the same warm-cache path as manual ones.
        await publishMessage(CHANNELS.listUpdate(list.id), {
          type: "list_updated",
          listId: list.id,
          eventKey: `job:${list.id}:metadata_refreshed:${Date.now()}`,
          action: "metadata_refreshed",
          timestamp: new Date().toISOString(),
        });

        totalRefreshed += urls.length;
        totalSuccess += successCount;
        totalErrors += errorCount;


        // Small delay between lists
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (_error) {
        // Continue with next list
      }
    }


    return NextResponse.json({
      success: true,
      message: `Refreshed metadata for ${totalRefreshed} URLs across ${lists.length} lists`,
      refreshed: totalRefreshed,
      lists: lists.length,
      results: {
        success: totalSuccess,
        errors: totalErrors,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Metadata refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
