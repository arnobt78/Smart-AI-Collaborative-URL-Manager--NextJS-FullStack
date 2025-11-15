import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addCollaborator, getListById } from "@/lib/db";
import { sendCollaboratorInviteEmail } from "@/lib/email";
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

    const { email } = await req.json();
    const { id } = await params;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to add collaborators" },
        { status: 403 }
      );
    }

    const updatedList = await addCollaborator(id, email);

    // Create activity log
    await createActivity(id, user.id, "collaborator_added", {
      collaboratorEmail: email,
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
