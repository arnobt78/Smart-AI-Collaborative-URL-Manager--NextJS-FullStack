import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type {
  User as PrismaUser,
  Session as PrismaSession,
} from "@prisma/client";

const SESSION_TOKEN_KEY = "session_token";

// Export types based on Prisma models
export type User = PrismaUser;
export type Session = PrismaSession & { user?: User };

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random session token
 */
function generateToken(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Create a session for a user
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

// Cache for session within the same request (Next.js request memoization)
let sessionCache: { token: string; session: Session | null; timestamp: number } | null = null;
const CACHE_TTL = 1000; // 1 second cache to prevent multiple DB calls in same request

/**
 * Get the current session from cookies
 * Uses request-level caching to prevent multiple DB calls within the same request
 */
export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_TOKEN_KEY)?.value;

  if (!token) return null;

  // Check cache first (if same token and within cache TTL)
  const now = Date.now();
  if (
    sessionCache &&
    sessionCache.token === token &&
    now - sessionCache.timestamp < CACHE_TTL
  ) {
    return sessionCache.session;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    // Session expired or invalid
    await deleteSession(token);
    sessionCache = { token, session: null, timestamp: now };
    return null;
  }

  // Cache the result
  sessionCache = { token, session, timestamp: now };
  return session;
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string
): Promise<User> {
  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Authenticate a user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  return user;
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string): Promise<User> {
  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  return createUser(email, password);
}

/**
 * Sign in a user and create a session
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const user = await authenticateUser(email, password);
  if (!user) return null;

  const token = await createSession(user.id);

  return { user, token };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await deleteSession(session.token);
  }
}

/**
 * Get the current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
  });
}
