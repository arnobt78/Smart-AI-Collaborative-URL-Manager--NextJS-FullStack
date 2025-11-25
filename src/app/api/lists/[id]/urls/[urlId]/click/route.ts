import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getListById } from "@/lib/db";
import type { UrlItem } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { hasListAccess } from "@/lib/collaboration/permissions";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { redis, cacheKeys } from "@/lib/redis";
import type { UrlItem as StoreUrlItem } from "@/stores/urlListStore";

type RouteContext = { params: Promise<{ id: string; urlId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const listId = params.id;
    const urlId = params.urlId;

    // Get the list and verify ownership
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user has access to this list (validates role-based system and removes old collaborators)
    const hasAccess = await hasListAccess(list, user);
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get current clickCount before update for logging
    const currentUrls = (list.urls as unknown as StoreUrlItem[]) || [];
    const currentUrl = currentUrls.find((url) => url.id === urlId);
    const oldClickCount = currentUrl?.clickCount || 0;

    // Update the URL's clickCount atomically to prevent race conditions
    // Use transaction with row locking to ensure atomic updates
    let newClickCount = oldClickCount + 1;
    let fullUpdatedList;

    try {
      fullUpdatedList = await prisma.$transaction(async (tx) => {
        // Step 1: Lock the row using raw SQL FOR UPDATE
        // Note: PostgreSQL returns JSONB as already parsed object, not as string
        const lockedRow = await tx.$queryRaw<Array<{ urls: unknown }>>`
          SELECT urls FROM lists WHERE id = ${listId} FOR UPDATE
        `;

        if (!lockedRow || lockedRow.length === 0) {
          throw new Error("List not found");
        }

        // Step 2: Parse and update URLs
        // The urls field is already parsed from JSONB, just cast it
        const urls = (lockedRow[0].urls as unknown as StoreUrlItem[]) || [];
        const urlIndex = urls.findIndex((url) => url.id === urlId);

        if (urlIndex === -1) {
          throw new Error("URL not found in list");
        }

        // Increment click count
        const currentCount = urls[urlIndex].clickCount || 0;
        newClickCount = currentCount + 1;

        const updatedUrls = [...urls];
        updatedUrls[urlIndex] = {
          ...updatedUrls[urlIndex],
          clickCount: newClickCount,
        };

        // Step 3: Save the updated list
        const result = await tx.list.update({
          where: { id: listId },
          data: {
            urls: updatedUrls as unknown as Prisma.InputJsonValue,
          },
        });

        console.log(`✅ [CLICK] Database update committed for ${urlId}: ${oldClickCount} → ${newClickCount}`);

        return result;
      }, {
        isolationLevel: 'ReadCommitted',
        timeout: 5000,
        maxWait: 5000,
      });
    } catch (dbError) {
      console.error(`❌ [CLICK] Database transaction failed:`, dbError);
      throw dbError;
    }

    if (!fullUpdatedList) {
      return NextResponse.json({ error: "List not found after update" }, { status: 404 });
    }

    // Log the final update
    console.log(`✅ [CLICK] Transaction completed. Final clickCount: ${newClickCount}`);

    // Invalidate Redis cache for this list's metadata and URLs
    // This ensures the updated clickCount is fetched fresh on next request
    if (redis) {
      try {
        await Promise.all([
          redis.del(cacheKeys.listMetadata(listId)),
          redis.del(`list-urls:${listId}`),
        ]);
      } catch (error) {
        // Non-critical, log but don't fail the request
        console.warn("⚠️ [CLICK] Failed to invalidate Redis cache:", error);
      }
    }

    // Publish real-time updates so other screens see the click count change
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(listId), {
        type: "list_updated",
        listId: listId,
        action: "url_clicked",
        urlId: urlId,
        clickCount: newClickCount,
        timestamp: new Date().toISOString(),
      }),
      publishMessage(CHANNELS.listActivity(listId), {
        type: "activity_created",
        listId: listId,
        action: "url_clicked",
        urlId: urlId,
        clickCount: newClickCount,
        timestamp: new Date().toISOString(),
      }),
    ]);

    return NextResponse.json({
      success: true,
      clickCount: newClickCount,
      list: fullUpdatedList,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to track URL click";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
