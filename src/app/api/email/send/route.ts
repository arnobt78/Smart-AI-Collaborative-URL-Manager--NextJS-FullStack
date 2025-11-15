import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import {
  getWelcomeEmail,
  getCollaboratorInviteEmail,
  type WelcomeEmailProps,
  type CollaboratorInviteProps,
} from "@/lib/email/templates";

type EmailType = "welcome" | "collaborator-invite";

interface EmailRequest {
  type: EmailType;
  data: WelcomeEmailProps | CollaboratorInviteProps;
}

export async function POST(req: NextRequest) {
  try {
    const body: EmailRequest = await req.json();
    const { type, data } = body;

    let emailContent;
    let toEmail: string;

    switch (type) {
      case "welcome": {
        const props = data as WelcomeEmailProps;
        toEmail = props.userEmail;
        emailContent = getWelcomeEmail(props);
        break;
      }
      case "collaborator-invite": {
        const props = data as CollaboratorInviteProps;
        toEmail = props.inviteeEmail;
        emailContent = getCollaboratorInviteEmail(props);
        break;
      }
      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    const uniqueId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      headers: {
        "X-Mailer": "The Daily Urlist",
        "X-Entity-Ref-ID": uniqueId,
        "Message-ID": `<${uniqueId}@daily-urlist.app>`,
      },
      tags: [
        {
          name: "email-type",
          value: type,
        },
        {
          name: "timestamp",
          value: Date.now().toString(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
