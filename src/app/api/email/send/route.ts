import { NextRequest, NextResponse } from "next/server";
import {
  sendWelcomeEmail,
  sendCollaboratorInviteEmail,
} from "@/lib/email";
import type { CollaboratorInviteProps, WelcomeEmailProps } from "@/lib/email/templates";
import { emailSendSchema, parseJsonBody } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, emailSendSchema);
    if (!parsed.success) return parsed.response;
    const { type, data } = parsed.data;

    let result:
      | Awaited<ReturnType<typeof sendWelcomeEmail>>
      | Awaited<ReturnType<typeof sendCollaboratorInviteEmail>>;

    switch (type) {
      case "welcome": {
        const props = data as WelcomeEmailProps;
        result = await sendWelcomeEmail(props);
        break;
      }
      case "collaborator-invite": {
        const props = data as CollaboratorInviteProps;
        result = await sendCollaboratorInviteEmail(props);
        break;
      }
      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to send email",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
