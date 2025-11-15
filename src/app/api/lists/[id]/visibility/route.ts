import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateList, getListById } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isPublic } = await req.json();
    const { id } = await params;

    // Check if user owns the list
    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this list" },
        { status: 403 }
      );
    }

    await updateList(id, { isPublic });

    // Create activity log
    await createActivity(id, user.id, isPublic ? "list_made_public" : "list_made_private", {
      isPublic,
    });

    // Publish real-time update
    await publishMessage(CHANNELS.listUpdate(id), {
      type: "list_updated",
      listId: id,
      action: isPublic ? "list_made_public" : "list_made_private",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(id), {
      type: "activity_created",
      listId: id,
      action: isPublic ? "list_made_public" : "list_made_private",
      timestamp: new Date().toISOString(),
    });

    // Fetch and return the updated list
    const updatedList = await getListById(id);
    return NextResponse.json({ list: updatedList });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update visibility";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
