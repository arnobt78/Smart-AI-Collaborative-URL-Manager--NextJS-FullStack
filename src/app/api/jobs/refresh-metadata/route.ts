import { NextRequest, NextResponse } from "next/server";
import { getListById, updateList } from "@/lib/db";
import type { UrlItem } from "@/stores/urlListStore";
import { uploadExternalImage } from "@/lib/cloudinary-server";

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

          // Update URL with new metadata
          const updatedUrl: UrlItem = {
            ...urlItem,
            title: metadata.title || urlItem.title,
            description: metadata.description || urlItem.description,
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
    await updateList(listId, { urls: updatedUrls });

    const duration = Date.now() - startTime;
    console.log(
      `✅ [METADATA REFRESH] Completed in ${duration}ms - Success: ${successCount}, Errors: ${errorCount}`
    );

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

