import nodemailer from "nodemailer";

// Create transporter only if SMTP is configured
function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is required (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Gmail App Password
    },
  });
}

export const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";
export const FROM_NAME = process.env.SMTP_FROM_NAME || "The Daily Urlist";

/**
 * Send email using SMTP
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  headers,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const mailOptions = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
    headers: {
      ...headers,
      "X-Mailer": FROM_NAME,
      "X-Entity-Ref-ID": uniqueId,
      "Message-ID": `<${uniqueId}@daily-urlist.app>`,
    },
  };

  const transporter = createTransporter();
  const result = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: result.messageId,
  };
}
