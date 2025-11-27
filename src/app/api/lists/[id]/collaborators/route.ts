import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getCollaboratorsWithRoles,
  getListById,
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
    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Owner can always view
    if (list.userId === user.id) {
      const collaborators = await getCollaboratorsWithRoles(id);
      return NextResponse.json({ collaborators });
    }

    // Check if user is a collaborator (from new role-based system)
    if (list.collaboratorRoles && typeof list.collaboratorRoles === "object") {
      const roles = list.collaboratorRoles as Record<string, string>;
      if (roles[user.email] === "editor" || roles[user.email] === "viewer") {
        const collaborators = await getCollaboratorsWithRoles(id);
        return NextResponse.json({ collaborators });
      }
    }

    // Fallback: Check legacy collaborators array
    if (list.collaborators && Array.isArray(list.collaborators) && list.collaborators.includes(user.email)) {
      const collaborators = await getCollaboratorsWithRoles(id);
      return NextResponse.json({ collaborators });
    }

    // Public list - allow viewing collaborators
    if (list.isPublic) {
      const collaborators = await getCollaboratorsWithRoles(id);
      return NextResponse.json({ collaborators });
    }

    // No access
    return NextResponse.json(
      { error: "You don't have permission to view collaborators" },
      { status: 403 }
    );

    const collaborators = await getCollaboratorsWithRoles(id);
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role = "editor" } = await req.json();
    const { id } = await params;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (role !== "editor" && role !== "viewer") {
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'" },
        { status: 400 }
      );
    }

    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check permission (only owner can add collaborators)
    try {
      await requirePermission(id, user.id, "invite");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // addCollaborator handles duplicate prevention (case-insensitive) - 
    // if collaborator exists, it updates the role instead of creating duplicate
    const updatedList = await addCollaborator(id, email.trim(), role);

    // Create activity log
    const activity = await createActivity(id, user.id, "collaborator_added", {
      collaboratorEmail: email,
      role: role,
    });

    // Publish real-time update
    await publishMessage(CHANNELS.listUpdate(id), {
      type: "list_updated",
      listId: id,
      action: "collaborator_added",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(id), {
      type: "activity_created",
      listId: id,
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
        console.log(
          `✅ Collaborator invite email sent to ${email}:`,
          result.messageId
        );
      } else {
        emailError = result.error || "Failed to send email";
        console.error(`❌ Failed to send email to ${email}:`, emailError);
      }
    } catch (emailErr: unknown) {
      emailError =
        emailErr instanceof Error ? emailErr.message : "Unknown error";
      console.error(
        `❌ Failed to send collaborator invite email to ${email}:`,
        emailErr
      );
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role } = await req.json();
    const { id } = await params;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (role !== "editor" && role !== "viewer") {
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'" },
        { status: 400 }
      );
    }

    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check permission (only owner can update collaborator roles)
    try {
      await requirePermission(id, user.id, "invite");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const updatedList = await updateCollaboratorRole(id, email, role);

    // Create activity log
    const activity = await createActivity(id, user.id, "collaborator_role_updated", {
      collaboratorEmail: email,
      role: role,
    });

    // Publish real-time update
    await publishMessage(CHANNELS.listUpdate(id), {
      type: "list_updated",
      listId: id,
      action: "collaborator_role_updated",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(id), {
      type: "activity_created",
      listId: id,
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email query parameter is required" },
        { status: 400 }
      );
    }

    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check permission (only owner can remove collaborators)
    try {
      await requirePermission(id, user.id, "invite");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const updatedList = await removeCollaborator(id, email);

    // Create activity log
    const activity = await createActivity(id, user.id, "collaborator_removed", {
      collaboratorEmail: email,
    });

    // Publish real-time update
    await publishMessage(CHANNELS.listUpdate(id), {
      type: "list_updated",
      listId: id,
      action: "collaborator_removed",
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(id), {
      type: "activity_created",
      listId: id,
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
