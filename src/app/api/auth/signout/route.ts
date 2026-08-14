import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { cookies } from "next/headers";
import { WAS_AUTHED_COOKIE } from "@/constants/auth";

export async function POST() {
  try {
    await signOut();

    // Clear session + wasAuthed hint (SSR must not paint Marketing after logout)
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
    cookieStore.delete(WAS_AUTHED_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sign out";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

