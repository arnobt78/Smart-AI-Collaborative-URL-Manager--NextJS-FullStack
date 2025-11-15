import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    await signOut();

    // Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.delete('session_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sign out';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

