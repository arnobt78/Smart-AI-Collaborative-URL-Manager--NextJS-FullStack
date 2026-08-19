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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has access to view collaborators
    // Allow viewing if: user is owner OR user is a collaborator (editor/viewer)
    // Support both slug and ID
    const list = await getListBySlugOrId(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Use list.id for all operations (ensures we use UUID)
    const listId = list.id;

    // Owner can always view
    if (list.userId === user.id) {
      const collaborators = await getCollaboratorsWithRoles(listId);
      return NextResponse.json({ collaborators });
    }

    // Check if user is a collaborator (from new role-based system)
    if (list.collaboratorRoles && typeof list.collaboratorRoles === "object") {
      const roles = list.collaboratorRoles as Record<string, string>;
      if (roles[user.email] === "editor" || roles[user.email] === "viewer") {
        const collaborators = await getCollaboratorsWithRoles(listId);
        return NextResponse.json({ collaborators });
      }
    }

    // Fallback: Check legacy collaborators array
    if (list.collaborators && Array.isArray(list.collaborators) && list.collaborators.includes(user.email)) {
      const collaborators = await getCollaboratorsWithRoles(listId);
      return NextResponse.json({ collaborators });
    }

    // Public list - allow viewing collaborators
    if (list.isPublic) {
      const collaborators = await getCollaboratorsWithRoles(listId);
      return NextResponse.json({ collaborators });
    }

    // No access
    return NextResponse.json(
      { error: "You don't have permission to view collaborators" },
      { status: 403 }
    );

    const collaborators = await getCollaboratorsWithRoles(listId);
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
    const updatedList = await addCollaborator(listId, email.trim(), role);

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
      slug: list.slug, // CRITICAL: Include slug for query invalidation on collaborator screens
      action: "collaborator_added",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId: listId,
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
        if (process.env.NODE_ENV === "development") {
        }
      } else {
        emailError = result.error || "Failed to send email";
        if (process.env.NODE_ENV === "development") {
        }
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
      listId: listId, // Use UUID, not slug
      slug: list.slug, // CRITICAL: Include slug in event data for query invalidation on collaborator screens
      action: "collaborator_role_updated",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    // CRITICAL: Use listId (UUID) for channel, not slug
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId: listId, // Use UUID, not slug
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
      slug: list.slug, // CRITICAL: Include slug for query invalidation on collaborator screens
      action: "collaborator_removed",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId: listId,
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
