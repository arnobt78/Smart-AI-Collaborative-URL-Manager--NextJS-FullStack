import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sign in the user
    const result = await signIn(email, password);

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sign in';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

