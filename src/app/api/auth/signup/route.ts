import { NextRequest, NextResponse } from "next/server";
import { signUp, createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/email";
import { WAS_AUTHED_COOKIE } from "@/constants/auth";
import { wasAuthedCookieSetOptions } from "@/lib/was-authed";
import { parseJsonBody, signUpSchema } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, signUpSchema);
    if (!parsed.success) return parsed.response;
    const { email, password } = parsed.data;

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
      } else {
      }
    } catch {
      // Email delivery is non-critical after the account and session are persisted.
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to sign up" }, { status: 400 });
  }
}
