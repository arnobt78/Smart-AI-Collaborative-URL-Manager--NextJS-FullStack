export interface WelcomeEmailProps {
  userEmail: string;
  userName?: string;
}

export interface CollaboratorInviteProps {
  inviterEmail: string;
  inviterName?: string;
  listTitle: string;
  listSlug: string;
  inviteeEmail: string;
}

/**
 * Generate a unique identifier for email subjects to avoid spam filters
 */
function generateUniqueId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export function getWelcomeEmail({ userEmail, userName }: WelcomeEmailProps) {
  const displayName = userName || userEmail.split("@")[0];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const uniqueId = generateUniqueId();

  return {
    subject: `Welcome to The Daily Urlist, ${displayName}! 🎉 [${uniqueId}]`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to The Daily Urlist</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a1a2e;">
          <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#1a1a2e" style="background-color: #1a1a2e; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" bgcolor="#0a0a0a" style="background-color: #0a0a0a; border-radius: 16px; border: 1px solid #333333; overflow: hidden; max-width: 600px;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#3b82f6" style="background-color: #3b82f6; padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        🔗 The Daily Urlist
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 40px 30px;">
                      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0;">
                        Welcome, ${displayName}! 👋
                      </h2>
                      <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        We're thrilled to have you join The Daily Urlist! You're now part of a community that makes organizing and sharing URLs effortless and beautiful.
                      </p>
                      <div bgcolor="#1e3a5f" style="background-color: #1e3a5f; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 8px;">
                        <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 15px 0;">🚀 Quick Start Guide</h3>
                        <ul style="color: #e0e0e0; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          <li>Create your first list in seconds</li>
                          <li>Add URLs with beautiful previews</li>
                          <li>Share your lists with friends</li>
                          <li>Collaborate with team members</li>
                        </ul>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 30px 0;">
                            <a href="${baseUrl}/new" 
                               bgcolor="#3b82f6" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                              Create Your First List →
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #b0b0b0; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        Need help? Just reply to this email or visit our <a href="${baseUrl}" style="color: #60a5fa; text-decoration: none;">website</a>.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td bgcolor="#0f0f0f" style="background-color: #0f0f0f; padding: 30px; text-align: center; border-top: 1px solid #333333;">
                      <p style="color: #808080; font-size: 12px; margin: 0 0 10px 0;">
                        Made with ❤️ by The Daily Urlist Team
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Welcome to The Daily Urlist, ${displayName}!
    
We're thrilled to have you join us! You're now part of a community that makes organizing and sharing URLs effortless and beautiful.

🚀 Quick Start Guide:
- Create your first list in seconds
- Add URLs with beautiful previews
- Share your lists with friends
- Collaborate with team members

Get started: ${baseUrl}/new

Need help? Just reply to this email.

Made with ❤️ by The Daily Urlist Team`,
  };
}

export function getCollaboratorInviteEmail({
  inviterEmail,
  inviterName,
  listTitle,
  listSlug,
  inviteeEmail,
}: CollaboratorInviteProps) {
  const displayName = inviterName || inviterEmail.split("@")[0];
  const inviteeName = inviteeEmail.split("@")[0];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const listUrl = `${baseUrl}/list/${listSlug}`;
  const uniqueId = generateUniqueId();

  return {
    subject: `${displayName} invited you to collaborate on "${listTitle}" [${uniqueId}]`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Collaboration Invitation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a1a2e;">
          <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#1a1a2e" style="background-color: #1a1a2e; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" bgcolor="#0a0a0a" style="background-color: #0a0a0a; border-radius: 16px; border: 1px solid #333333; overflow: hidden; max-width: 600px;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#8b5cf6" style="background-color: #8b5cf6; padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        🤝 Collaboration Invitation
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 40px 30px;">
                      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: bold;">
                        Hi ${inviteeName}! You've been invited! 🎉
                      </h2>
                      <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        <strong style="color: #ffffff;">${displayName}</strong> (${inviterEmail}) has invited you to collaborate on their list:
                      </p>
                      <div bgcolor="#2d1b4e" style="background-color: #2d1b4e; border-left: 4px solid #8b5cf6; padding: 20px; margin: 30px 0; border-radius: 8px;">
                        <h3 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: bold;">📋 ${listTitle}</h3>
                      </div>
                      <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        As a collaborator, you can add, edit, and organize URLs in this list. Start collaborating right away!
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 30px 0;">
                            <a href="${listUrl}" 
                               bgcolor="#8b5cf6" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);">
                              View List →
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #b0b0b0; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        Didn't expect this invitation? You can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td bgcolor="#0f0f0f" style="background-color: #0f0f0f; padding: 30px; text-align: center; border-top: 1px solid #333333;">
                      <p style="color: #808080; font-size: 12px; margin: 0;">
                        Made with ❤️ by The Daily Urlist Team
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Hi ${inviteeName}!

${displayName} (${inviterEmail}) has invited you to collaborate on "${listTitle}".

As a collaborator, you can add, edit, and organize URLs in this list.

View the list: ${listUrl}

Didn't expect this invitation? You can safely ignore this email.

Made with ❤️ by The Daily Urlist Team`,
  };
}
