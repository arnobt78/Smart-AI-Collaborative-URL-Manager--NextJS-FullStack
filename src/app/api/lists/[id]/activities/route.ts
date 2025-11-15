import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById } from "@/lib/db";
import { getActivitiesForList } from "@/lib/db/activities";

/**
 * GET /api/lists/[id]/activities
 * Get activity feed for a list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Verify list exists and user has access
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const hasAccess =
      list.isPublic ||
      (user &&
        (list.userId === user.id ||
          (list.collaborators && list.collaborators.includes(user.email))));

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized access to this list" },
        { status: 403 }
      );
    }

    // Get activities
    const activities = await getActivitiesForList(listId, limit);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("❌ [ACTIVITIES] Failed to get activities:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get activities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

