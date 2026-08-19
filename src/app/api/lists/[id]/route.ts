import { NextRequest, NextResponse } from "next/server";
import { updateList, deleteList, type UrlItem } from "@/lib/db";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import { listPatchSchema, parseJsonBody } from "@/lib/api-validation";

type RouteContext = { params: Promise<{ id: string }> };
type ListPatch = import("zod").z.output<typeof listPatchSchema>;

function routeError(error: { status: number; error: string }) {
  return NextResponse.json({ error: error.error }, { status: error.status });
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await resolveAuthorizedList(id, "view");
    if (!access.ok) return routeError(access);

    const { list } = access;
    const urls = (list.urls as unknown as UrlItem[]) || [];
    let needsPositionInit = false;
    const urlsWithPositions = urls.map((url, index) => {
      if (url.position === undefined) {
        needsPositionInit = true;
        return { ...url, position: index };
      }
      return url;
    });

    if (needsPositionInit && urlsWithPositions.length > 0) {
      urlsWithPositions.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      // A view request must never mutate a list. Return stable legacy positions
      // in this response; the next authorized URL mutation persists ordering.
      list.urls = urlsWithPositions as unknown as typeof list.urls;
    }

    return NextResponse.json({ list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await resolveAuthorizedList(id, "delete");
    if (!access.ok) return routeError(access);

    await deleteList(access.list.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const parsed = await parseJsonBody(req, listPatchSchema);
    if (!parsed.success) return parsed.response;
    const updates: ListPatch = parsed.data;

    const { id } = await context.params;
    const permission = updates.isPublic === undefined ? "edit" : "visibility";
    const access = await resolveAuthorizedList(id, permission);
    if (!access.ok) return routeError(access);
    if (!access.user) return routeError({ status: 401, error: "Unauthorized" });

    const list = await updateList(access.list.id, updates);
    const activityDetails: Record<string, unknown> = {};
    let activityAction: "list_made_public" | "list_made_private" | "list_updated" | null = null;

    if (updates.isPublic !== undefined) {
      activityDetails.isPublic = updates.isPublic;
      activityAction = updates.isPublic ? "list_made_public" : "list_made_private";
    } else if (updates.title !== undefined || updates.description !== undefined) {
      if (updates.title !== undefined) activityDetails.title = updates.title;
      if (updates.description !== undefined) activityDetails.description = updates.description;
      activityAction = "list_updated";
    }

    if (activityAction) {
      const activity = await createActivity(access.list.id, access.user.id, activityAction, activityDetails);
      await publishMessage(CHANNELS.listUpdate(access.list.id), {
        type: "list_updated",
        listId: access.list.id,
        action: activityAction,
        timestamp: new Date().toISOString(),
      });
      await publishMessage(CHANNELS.listActivity(access.list.id), {
        type: "activity_created",
        listId: access.list.id,
        action: activityAction,
        timestamp: new Date().toISOString(),
        activity: {
          id: activity.id,
          action: activity.action,
          details: activity.details,
          createdAt: activity.createdAt.toISOString(),
          user: activity.user ?? { id: access.user.id, email: access.user.email },
        },
      });
    }

    return NextResponse.json({ list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
