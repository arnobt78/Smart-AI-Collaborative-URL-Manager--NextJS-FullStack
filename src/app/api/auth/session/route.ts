import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    const sessionWithUser = session as Session;
    return NextResponse.json({
      user: {
        id: session.userId,
        email: sessionWithUser.user?.email || null,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
