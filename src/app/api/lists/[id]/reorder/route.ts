import { NextRequest, NextResponse } from "next/server";
import { getListById, updateList } from "@/lib/db";
import { upsertUrlVectors, deleteUrlVector, vectorIndex } from "@/lib/vector";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { createActivity } from "@/lib/db/activities";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/collaboration/permissions";
import type { UrlItem } from "@/stores/urlListStore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { urls, action } = await req.json();
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get current list to detect changes
    const currentList = await getListById(id);
    if (!currentList) {
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

    const currentUrls = (currentList.urls as unknown as UrlItem[]) || [];
    const newUrls = (urls as UrlItem[]) || [];

    // Detect what action was performed
    let activityAction = "url_reordered";
    let activityDetails: Record<string, unknown> = { urlCount: newUrls.length };

    if (action) {
      // Action explicitly provided (e.g., "url_added", "url_deleted", "url_updated")
      activityAction = action;

      if (action === "url_added") {
        const addedUrl = newUrls.find(
          (u) => !currentUrls.some((cu) => cu.id === u.id)
        );
        if (addedUrl) {
          activityDetails = {
            urlId: addedUrl.id,
            url: addedUrl.url,
            urlTitle: addedUrl.title || addedUrl.url,
          };
        }
      } else if (action === "url_deleted") {
        const deletedUrl = currentUrls.find(
          (u) => !newUrls.some((nu) => nu.id === u.id)
        );
        if (deletedUrl) {
          activityDetails = {
            urlId: deletedUrl.id,
            url: deletedUrl.url,
            urlTitle: deletedUrl.title || deletedUrl.url,
          };
        }
      } else if (action === "url_updated") {
        // Find which URL was updated
        const updatedUrl = newUrls.find((nu) => {
          const oldUrl = currentUrls.find((cu) => cu.id === nu.id);
          return oldUrl && JSON.stringify(oldUrl) !== JSON.stringify(nu);
        });
        if (updatedUrl) {
          activityDetails = {
            urlId: updatedUrl.id,
            url: updatedUrl.url,
            urlTitle: updatedUrl.title || updatedUrl.url,
          };
        }
      }
    } else {
      // Detect action based on differences
      if (newUrls.length > currentUrls.length) {
        activityAction = "url_added";
        const addedUrl = newUrls.find(
          (u) => !currentUrls.some((cu) => cu.id === u.id)
        );
        if (addedUrl) {
          activityDetails = {
            urlId: addedUrl.id,
            url: addedUrl.url,
            urlTitle: addedUrl.title || addedUrl.url,
          };
        }
      } else if (newUrls.length < currentUrls.length) {
        activityAction = "url_deleted";
        const deletedUrl = currentUrls.find(
          (u) => !newUrls.some((nu) => nu.id === u.id)
        );
        if (deletedUrl) {
          activityDetails = {
            urlId: deletedUrl.id,
            url: deletedUrl.url,
            urlTitle: deletedUrl.title || deletedUrl.url,
          };
        }
      } else if (newUrls.length === currentUrls.length) {
        // Check if URLs were reordered or updated
        const isReordered =
          JSON.stringify(newUrls.map((u) => u.id)) !==
          JSON.stringify(currentUrls.map((u) => u.id));
        if (isReordered) {
          activityAction = "url_reordered";
        } else {
          activityAction = "url_updated";
          const updatedUrl = newUrls.find((nu) => {
            const oldUrl = currentUrls.find((cu) => cu.id === nu.id);
            return oldUrl && JSON.stringify(oldUrl) !== JSON.stringify(nu);
          });
          if (updatedUrl) {
            activityDetails = {
              urlId: updatedUrl.id,
              url: updatedUrl.url,
              urlTitle: updatedUrl.title || updatedUrl.url,
            };
          }
        }
      }
    }

    const updated = await updateList(id, { urls: newUrls });

    // Log activity
    await createActivity(id, user.id, activityAction, activityDetails);

    // Publish real-time update
    await publishMessage(CHANNELS.listUpdate(id), {
      type: "list_updated",
      listId: id,
      action: activityAction,
      timestamp: new Date().toISOString(),
      urlCount: newUrls.length,
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(id), {
      type: "activity_created",
      listId: id,
      action: activityAction,
      timestamp: new Date().toISOString(),
    });

    // Sync vectors in background (non-blocking)
    if (vectorIndex) {
      // Find deleted URLs
      const newUrlIds = new Set(newUrls.map((u) => u.id));
      const deletedUrlIds = currentUrls
        .filter((u) => !newUrlIds.has(u.id))
        .map((u) => u.id);

      // Delete vectors for removed URLs
      if (deletedUrlIds.length > 0) {
        console.log(
          `🔄 [VECTOR SYNC] Deleting ${deletedUrlIds.length} vectors after URL removal`
        );
        Promise.all(
          deletedUrlIds.map((urlId) => deleteUrlVector(urlId, id))
        ).catch((error) => {
          console.error("❌ [VECTOR] Failed to delete URL vectors:", error);
        });
      }

      // Upsert vectors for all current URLs
      if (newUrls.length > 0) {
        console.log(
          `🔄 [VECTOR SYNC] Syncing ${newUrls.length} URLs after reorder/update`
        );
        upsertUrlVectors(newUrls, id).catch((error) => {
          console.error("❌ [VECTOR] Failed to sync URLs to vector DB:", error);
        });
      }
    }

    return NextResponse.json({ success: true, list: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reorder URLs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
