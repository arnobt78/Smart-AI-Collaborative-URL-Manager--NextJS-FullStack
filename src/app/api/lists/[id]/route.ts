import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlug, updateList, deleteList, type UrlItem } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { hasListAccess } from "@/lib/collaboration/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const list = await getListBySlug(id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user has access to this list (validates role-based system and removes old collaborators)
    const user = await getCurrentUser();
    const hasAccess = await hasListAccess(list, user);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize positions for URLs that don't have them (backward compatibility)
    const urls = (list.urls as unknown as UrlItem[]) || [];
    let needsPositionInit = false;

    const urlsWithPositions: UrlItem[] = urls.map((url, idx) => {
      if (url.position === undefined) {
        needsPositionInit = true;
        return { ...url, position: idx };
      }
      return url;
    });

    // If positions were initialized, save them back to database
    if (needsPositionInit && urlsWithPositions.length > 0) {
      // Sort by position and update
      urlsWithPositions.sort(
        (a, b) => (a.position ?? 999) - (b.position ?? 999)
      );
      await updateList(list.id, { urls: urlsWithPositions });
      list.urls = urlsWithPositions as any;
      console.log(`✅ [GET] Initialized positions for ${list.id}`);
    }

    const urlOrder = urlsWithPositions.map((u) => u.id).join(",");
    // Log click counts for debugging
    if (process.env.NODE_ENV === "development") {
      const clickCounts = urlsWithPositions.map((u) => ({
        urlId: u.id,
        clickCount: u.clickCount || 0,
      }));
      console.log(`📋 [GET /api/lists/${id}] Returning list from database`, {
        listId: list.id,
        slug: list.slug,
        urlCount: urlsWithPositions.length,
        urlOrder: urlOrder,
        clickCounts: clickCounts,
      });
    }

    return NextResponse.json({ list });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteList(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const updates = await req.json();

    const list = await updateList(id, updates);

    // Create activity log for list metadata changes (only if there are meaningful changes)
    const activityDetails: Record<string, unknown> = {};
    let activityAction: string | null = null;

    if (updates.isPublic !== undefined) {
      // Visibility change - use specific action
      activityDetails.isPublic = updates.isPublic;
      activityAction = updates.isPublic
        ? "list_made_public"
        : "list_made_private";
    } else if (
      updates.title !== undefined ||
      updates.description !== undefined
    ) {
      // Title or description change - generic update
      if (updates.title !== undefined) activityDetails.title = updates.title;
      if (updates.description !== undefined)
        activityDetails.description = updates.description;
      activityAction = "list_updated";
    }

    // Only create activity if there's a meaningful change
    if (activityAction) {
      const activity = await createActivity(
        id,
        user.id,
        activityAction,
        activityDetails
      );

      // Publish real-time update
      await publishMessage(CHANNELS.listUpdate(id), {
        type: "list_updated",
        listId: id,
        action: activityAction,
        timestamp: new Date().toISOString(),
      });

      // Publish activity update
      await publishMessage(CHANNELS.listActivity(id), {
        type: "activity_created",
        listId: id,
        action: activityAction,
        timestamp: new Date().toISOString(),
        activity: {
          id: activity.id,
          action: activity.action,
          details: activity.details,
          createdAt: activity.createdAt.toISOString(),
          user: activity.user
            ? {
                id: activity.user.id,
                email: activity.user.email,
              }
            : {
                id: user.id,
                email: user.email,
              },
        },
      });
    } else {
      // Still publish list update even if no activity (for other metadata changes)
      await publishMessage(CHANNELS.listUpdate(id), {
        type: "list_updated",
        listId: id,
        action: "list_updated",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ list });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
