import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlug, updateList, deleteList } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";

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

    // Check if user has access to this list
    const user = await getCurrentUser();

    // Allow access if:
    // 1. List is public (anyone can view)
    // 2. User owns the list
    // 3. User is a collaborator
    const hasAccess =
      list.isPublic ||
      (user &&
        (list.userId === user.id ||
          (list.collaborators && list.collaborators.includes(user.email))));

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      await createActivity(id, user.id, activityAction, activityDetails);

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
