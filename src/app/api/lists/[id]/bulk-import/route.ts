import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById, updateList } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { upsertUrlVectors, vectorIndex } from "@/lib/vector";
import { requirePermission } from "@/lib/collaboration/permissions";
import { redis, cacheKeys } from "@/lib/redis";
import type { UrlItem } from "@/stores/urlListStore";
import { devLog } from "@/lib/dev-log";

type RouteContext = { params: Promise<{ id: string }> };

interface BulkImportUrl {
  url: string;
  title?: string;
  tags?: string[];
  notes?: string;
  reminder?: string;
  category?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
}

/**
 * POST /api/lists/[id]/bulk-import
 * Efficiently import multiple URLs at once
 * - Batches database writes
 * - Single activity log for bulk import
 * - Single real-time update
 * - Single vector sync
 */
export async function POST(req: NextRequest, context: RouteContext) {
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
    const body = await req.json();
    const { urls }: { urls: BulkImportUrl[] } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "URLs array is required" },
        { status: 400 }
      );
    }

    // Get current list
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

    // Find max position
    const maxPosition = currentUrls.reduce((max, u) => {
      const pos = u.position ?? 0;
      return pos > max ? pos : max;
    }, -1);

    // Create all new URL items
    const newUrls: UrlItem[] = urls.map((urlData, index) => ({
      id: crypto.randomUUID(),
      url: urlData.url,
      title:
        urlData.title || new URL(urlData.url).hostname.replace(/^www\./, ""),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: urlData.isFavorite || false,
      isPinned: urlData.isPinned || false,
      tags: urlData.tags || [],
      notes: urlData.notes || "",
      reminder: urlData.reminder,
      category: urlData.category,
      clickCount: 0,
      position: maxPosition + 1 + index,
    }));

    // Single database write with all URLs
    const updatedUrls = [...currentUrls, ...newUrls].sort(
      (a, b) => (a.position ?? 999) - (b.position ?? 999)
    );

    const updated = await updateList(listId, { urls: updatedUrls });

    // Single activity log for bulk import
    const activity = await createActivity(listId, user.id, "bulk_import", {
      urlCount: newUrls.length,
      urls: newUrls.map((u) => ({ id: u.id, url: u.url, title: u.title })),
    });

    // Single real-time update
    await Promise.all([
      publishMessage(CHANNELS.listUpdate(listId), {
        type: "list_updated",
        listId: listId,
        action: "bulk_import",
        timestamp: new Date().toISOString(),
        urlCount: updatedUrls.length,
      }),
      publishMessage(CHANNELS.listActivity(listId), {
        type: "activity_created",
        listId: listId,
        action: "bulk_import",
        timestamp: new Date().toISOString(),
        activity,
      }),
    ]);

    // Invalidate cache
    if (redis) {
      try {
        await Promise.all([
          redis.del(cacheKeys.listMetadata(listId)),
          redis.del(`list-urls:${listId}`),
        ]);
      } catch {
        // Ignore cache errors
      }
    }

    // Single vector sync for all URLs
    if (vectorIndex) {
      upsertUrlVectors(newUrls, listId).catch((error) => {
        console.error("Vector sync error:", error);
      });
    }

    devLog(
      `✅ [BULK IMPORT] Added ${newUrls.length} URLs to list ${listId}`
    );

    return NextResponse.json({
      success: true,
      list: updated,
      urls: newUrls,
      activity: {
        id: activity.id,
        action: "bulk_import",
        details: { urlCount: newUrls.length },
        createdAt: activity.createdAt,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("❌ [BULK IMPORT] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to bulk import URLs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
