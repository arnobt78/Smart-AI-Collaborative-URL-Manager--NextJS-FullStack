/**
 * Email service that supports both Resend and SMTP (Gmail)
 * Automatically uses SMTP if configured, otherwise falls back to Resend
 */

import { sendEmail as sendEmailSMTP } from "./smtp";
import {
  getWelcomeEmail,
  getCollaboratorInviteEmail,
  type WelcomeEmailProps,
  type CollaboratorInviteProps,
} from "./templates";
import type { Resend } from "resend";

// Type for Resend module exports
interface ResendModule {
  resend: Resend;
  FROM_EMAIL: string;
}

// Lazy load Resend to avoid errors if not configured
async function getResendModule(): Promise<ResendModule | null> {
  try {
    const resendModule = await import("./resend");
    return {
      resend: resendModule.resend,
      FROM_EMAIL: resendModule.FROM_EMAIL,
    };
  } catch {
    // Resend not configured, that's fine
    return null;
  }
}

// Check which email service to use
const USE_SMTP = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(props: WelcomeEmailProps) {
  const emailContent = getWelcomeEmail(props);

  if (USE_SMTP) {
    // Use SMTP (Gmail)
    try {
      const result = await sendEmailSMTP({
        to: props.userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Failed to send welcome email via SMTP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  } else {
    // Use Resend
    const resendModule = await getResendModule();
    if (!resendModule) {
      return {
        success: false,
        error: "Neither SMTP nor Resend is configured",
      };
    }

    try {
      const result = await resendModule.resend.emails.send({
        from: resendModule.FROM_EMAIL,
        to: props.userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (result.data?.id) {
        return { success: true, messageId: result.data.id };
      } else {
        return {
          success: false,
          error: "Email service returned no message ID",
        };
      }
    } catch (error) {
      console.error("Failed to send welcome email via Resend:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Send collaborator invite email
 */
export async function sendCollaboratorInviteEmail(
  props: CollaboratorInviteProps
) {
  const emailContent = getCollaboratorInviteEmail(props);

  if (USE_SMTP) {
    // Use SMTP (Gmail)
    try {
      const result = await sendEmailSMTP({
        to: props.inviteeEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(
        "Failed to send collaborator invite email via SMTP:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  } else {
    // Use Resend
    const resendModule = await getResendModule();
    if (!resendModule) {
      return {
        success: false,
        error: "Neither SMTP nor Resend is configured",
      };
    }

    try {
      const uniqueId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const result = await resendModule.resend.emails.send({
        from: resendModule.FROM_EMAIL,
        to: props.inviteeEmail,
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
            value: "collaborator-invite",
          },
          {
            name: "timestamp",
            value: Date.now().toString(),
          },
        ],
      });

      if (result.data?.id) {
        return { success: true, messageId: result.data.id };
      } else {
        return {
          success: false,
          error: "Email service returned no message ID",
        };
      }
    } catch (error) {
      console.error(
        "Failed to send collaborator invite email via Resend:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
