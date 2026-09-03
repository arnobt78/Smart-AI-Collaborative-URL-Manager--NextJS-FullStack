import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  collaboratorCreateSchema,
  collaboratorDeleteSchema,
  collaboratorUpdateSchema,
  parseJsonBody,
  parseRouteParams,
} from "@/lib/api-validation";
import {
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getCollaboratorsWithRoles,
  getListBySlugOrId,
} from "@/lib/db";
import { sendCollaboratorInviteEmail } from "@/lib/email";
import { createActivity } from "@/lib/db/activities";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { requirePermission } from "@/lib/collaboration/permissions";
import { resolveAuthorizedList } from "@/lib/list-route-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await resolveAuthorizedList(id, "view");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { list } = access;

    const collaborators = await getCollaboratorsWithRoles(list.id);
    return NextResponse.json({ collaborators });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch collaborators";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsed = await parseJsonBody(req, collaboratorCreateSchema);
    if (!parsed.success) return parsed.response;
    const { email, role } = parsed.data;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Support both slug and ID
    const list = await getListBySlugOrId(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for all operations (ensures we use UUID)
    const listId = list.id;

    // Check permission (only owner can add collaborators)
    try {
      await requirePermission(listId, user.id, "invite");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // addCollaborator handles duplicate prevention (case-insensitive) - 
    // if collaborator exists, it updates the role instead of creating duplicate
    const updatedList = await addCollaborator(
      listId,
      email.trim(),
      role,
      user.email,
    );

    // Create activity log
    const activity = await createActivity(listId, user.id, "collaborator_added", {
      collaboratorEmail: email,
      role: role,
    });

    // Publish real-time update
    // CRITICAL: Include slug in SSE event so collaborator screens can invalidate unified query
    await publishMessage(CHANNELS.listUpdate(listId), {
      type: "list_updated",
      listId: listId,
      eventKey: `activity:${activity.id}`,
      slug: list.slug,
      action: "collaborator_added",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId: listId,
      eventKey: `activity:${activity.id}`,
      action: "collaborator_added",
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
    });

    // Send collaborator invite email (don't fail if email fails)
    let emailSent = false;
    let emailError: string | null = null;

    try {
      const result = await sendCollaboratorInviteEmail({
        inviterEmail: user.email,
        inviterName: user.email.split("@")[0],
        listTitle: list.title,
        listSlug: list.slug,
        inviteeEmail: email,
        role: role as "editor" | "viewer",
      });

      if (result.success) {
        emailSent = true;
      } else {
        emailError = result.error || "Failed to send email";
      }
    } catch (emailErr: unknown) {
      emailError =
        emailErr instanceof Error ? emailErr.message : "Unknown error";
    }

    return NextResponse.json({
      list: updatedList,
      emailSent,
      emailError: emailError || undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add collaborator";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/lists/[id]/collaborators
 * Update collaborator role
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsed = await parseJsonBody(req, collaboratorUpdateSchema);
    if (!parsed.success) return parsed.response;
    const { email, role } = parsed.data;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Support both slug and ID
    const list = await getListBySlugOrId(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for all operations (ensures we use UUID)
    const listId = list.id;

    // Check permission (only owner can update collaborator roles)
    try {
      await requirePermission(listId, user.id, "invite");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const updatedList = await updateCollaboratorRole(listId, email, role);

    // Create activity log
    const activity = await createActivity(listId, user.id, "collaborator_role_updated", {
      collaboratorEmail: email,
      role: role,
    });

    // Publish real-time update
    // CRITICAL: Use listId (UUID) for channel, not slug - SSE subscribes using UUID
    // Include slug in SSE event data so collaborator screens can invalidate unified query
    await publishMessage(CHANNELS.listUpdate(listId), {
      type: "list_updated",
      listId: listId,
      eventKey: `activity:${activity.id}`,
      slug: list.slug,
      action: "collaborator_role_updated",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    // CRITICAL: Use listId (UUID) for channel, not slug
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId: listId,
      eventKey: `activity:${activity.id}`,
      action: "collaborator_role_updated",
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
    });

    return NextResponse.json({
      list: updatedList,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update collaborator";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/lists/[id]/collaborators
 * Remove collaborator from list
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const query = parseRouteParams(
      { email: req.nextUrl.searchParams.get("email") },
      collaboratorDeleteSchema,
    );
    if (!query.success) return query.response;
    const { email } = query.data;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Support both slug and ID
    const list = await getListBySlugOrId(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for all operations (ensures we use UUID)
    const listId = list.id;

    // Check permission (only owner can remove collaborators)
    try {
      await requirePermission(listId, user.id, "invite");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const updatedList = await removeCollaborator(listId, email);

    // Create activity log
    const activity = await createActivity(listId, user.id, "collaborator_removed", {
      collaboratorEmail: email,
    });

    // Publish real-time update
    // CRITICAL: Include slug in SSE event so collaborator screens can invalidate unified query
    await publishMessage(CHANNELS.listUpdate(listId), {
      type: "list_updated",
      listId: listId,
      eventKey: `activity:${activity.id}`,
      slug: list.slug,
      action: "collaborator_removed",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId: listId,
      eventKey: `activity:${activity.id}`,
      action: "collaborator_removed",
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
    });

    return NextResponse.json({
      list: updatedList,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove collaborator";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
