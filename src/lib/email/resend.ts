import { Resend } from "resend";

if (!process.env.RESEND_TOKEN) {
  throw new Error("RESEND_TOKEN is required");
}

export const resend = new Resend(process.env.RESEND_TOKEN);

// Use verified domain email if provided, otherwise use Resend's test email
// To verify a domain: https://resend.com/domains
// Once verified, set RESEND_FROM_EMAIL in .env.local like:
// RESEND_FROM_EMAIL="The Daily Urlist <noreply@yourdomain.com>"
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "The Daily Urlist <onboarding@resend.dev>";
export const FROM_NAME = "The Daily Urlist";

// Check if we're using a verified domain (not the test email)
export const isUsingVerifiedDomain = !FROM_EMAIL.includes(
  "onboarding@resend.dev"
);
