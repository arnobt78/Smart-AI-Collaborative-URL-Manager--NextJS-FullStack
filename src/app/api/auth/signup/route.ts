import { NextRequest, NextResponse } from "next/server";
import { signUp, createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/email";
import { WAS_AUTHED_COOKIE } from "@/constants/auth";
import { wasAuthedCookieSetOptions } from "@/lib/was-authed";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create the user
    const user = await signUp(email, password);

    // Create a session and set the cookie
    const token = await createSession(user.id);

    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });
    // SSR wasAuthed hint — Marketing + profile skeleton on next hard refresh
    cookieStore.set(WAS_AUTHED_COOKIE, "1", wasAuthedCookieSetOptions());

    // Send welcome email (don't fail signup if email fails)
    try {
      const result = await sendWelcomeEmail({
        userEmail: user.email,
      });
      if (result.success) {
        console.log(
          `✅ Welcome email sent to ${user.email}:`,
          result.messageId
        );
      } else {
        console.error(
          `❌ Failed to send welcome email to ${user.email}:`,
          result.error
        );
      }
    } catch (emailError) {
      // Log error but don't fail the signup
      console.error("Failed to send welcome email:", emailError);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sign up";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
