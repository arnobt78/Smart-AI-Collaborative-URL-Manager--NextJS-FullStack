import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById, updateList } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { deleteUrlVector, vectorIndex } from "@/lib/vector";
import { requirePermission } from "@/lib/collaboration/permissions";
import type { UrlItem } from "@/stores/urlListStore";

type RouteContext = { params: Promise<{ id: string; urlId: string }> };

/**
 * DELETE /api/lists/[id]/urls/[urlId]
 * Unified endpoint that handles URL deletion, order update, activity logging,
 * real-time updates, and vector sync in a single API call
 * Acts as a middleware/proxy layer similar to the metadata endpoint
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
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
    const urlId = params.urlId;

    // Get current list to detect changes
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
    
    // Find the URL to delete
    const deletedUrl = currentUrls.find((url) => url.id === urlId);
    if (!deletedUrl) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Remove the URL from the list
    const updatedUrls = currentUrls.filter((url) => url.id !== urlId);

    // Update the list with new URLs order
    const updated = await updateList(listId, { urls: updatedUrls });

    // Prepare activity details
    const activityDetails = {
      urlId: deletedUrl.id,
      url: deletedUrl.url,
      urlTitle: deletedUrl.title || deletedUrl.url,
      urlCount: updatedUrls.length,
    };

    // Log activity (happens in the same transaction/context)
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

    // Sync vectors in background (non-blocking)
    if (vectorIndex) {
      console.log(
        `🔄 [VECTOR SYNC] Deleting vector for URL ${urlId} after deletion`
      );
      deleteUrlVector(urlId, listId).catch((error) => {
        console.error("❌ [VECTOR] Failed to delete URL vector:", error);
      });
    }

    // Return unified response with updated list and activity info
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
    const message =
      error instanceof Error ? error.message : "Failed to delete URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

