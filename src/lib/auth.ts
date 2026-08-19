import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
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
  return randomBytes(32).toString("base64url");
}

/** REQ-0025: Persist opaque session credentials only as deterministic digests. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Clean up expired sessions (fire-and-forget, non-blocking)
 */
async function cleanupExpiredSessions(): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(), // Sessions that have expired
        },
      },
    });
  } catch (_error) {
    // Silently fail - cleanup is not critical
  }
}

/**
 * Clean up old sessions for a user, keeping only the most recent active ones
 * This prevents session accumulation when users log in multiple times
 * 
 * Strategy:
 * - Keep only 3 most recent active sessions (lastActivityAt within last 7 days)
 * - Delete all other sessions for the user (expired or old)
 */
async function cleanupOldSessionsForUser(
  userId: string,
  keepCount: number = 3
): Promise<void> {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all non-expired sessions for this user, ordered by lastActivityAt (most recent first)
    const allSessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          gte: now, // Only non-expired sessions
        },
      },
      orderBy: {
        lastActivityAt: "desc",
      },
      select: {
        id: true,
        lastActivityAt: true,
      },
    });

    // Separate into recent active sessions (used in last 7 days) and old sessions
    const recentActiveSessions = allSessions.filter(
      (s) => new Date(s.lastActivityAt) >= sevenDaysAgo
    );
    
    // Keep only the most recent active sessions
    const sessionsToKeep = recentActiveSessions.slice(0, keepCount);
    const sessionIdsToKeep = new Set(sessionsToKeep.map((s) => s.id));
    
    // Delete all other sessions for this user (expired, old, or beyond keepCount)
    const sessionsToDelete = allSessions
      .filter((s) => !sessionIdsToKeep.has(s.id))
      .map((s) => s.id);
    
    // Also delete expired sessions
    const expiredSessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          lt: now, // Expired sessions
        },
      },
      select: {
        id: true,
      },
    });
    
    const allSessionsToDelete = [
      ...sessionsToDelete,
      ...expiredSessions.map((s) => s.id),
    ];
    
    if (allSessionsToDelete.length > 0) {
      await prisma.session.deleteMany({
        where: {
          id: {
            in: allSessionsToDelete,
          },
        },
      });
      
    }
  } catch (_error) {
    // Silently fail - cleanup is not critical
  }
}

/**
 * Create a session for a user
 * This also aggressively cleans up old sessions for the user to prevent accumulation
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const tokenDigest = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      userId,
      token: tokenDigest,
      expiresAt,
    },
  });

  // Aggressively cleanup old sessions for this user BEFORE creating new one (fire-and-forget)
  // This ensures we don't accumulate sessions when users log in multiple times
  // Keep only 3 most recent active sessions (used in last 7 days)
  cleanupOldSessionsForUser(userId, 3).catch(() => {
    // Ignore errors
  });

  // Cleanup expired sessions globally (fire-and-forget, less frequent)
  // Only run cleanup occasionally to avoid overhead
  if (Math.random() < 0.1) {
    // 10% chance to run global cleanup (reduces overhead)
    cleanupExpiredSessions().catch(() => {
      // Ignore errors
    });
  }

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

  const tokenDigest = hashSessionToken(token);
  let session = await prisma.session.findUnique({
    where: { token: tokenDigest },
    include: { user: true },
  });

  if (!session) {
    const legacySession = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (legacySession) {
      try {
        session = await prisma.session.update({
          where: { id: legacySession.id },
          data: { token: tokenDigest },
          include: { user: true },
        });
      } catch (error) {
        // A concurrent request can rotate the same legacy token first. Re-read
        // the digest record rather than rejecting an otherwise valid session.
        const rotatedSession = await prisma.session.findUnique({
          where: { token: tokenDigest },
          include: { user: true },
        });
        if (!rotatedSession) throw error;
        session = rotatedSession;
      }
    }
  }

  if (!session || session.expiresAt < new Date()) {
    // Session expired or invalid
    await deleteSession(token);
    sessionCache = { token, session: null, timestamp: now };
    return null;
  }

  // Update lastActivityAt to track active users (don't await to avoid blocking)
  // This is fire-and-forget to not slow down the request
  prisma.session
    .update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    })
    .catch(() => undefined);

  // Cache the result
  sessionCache = { token, session, timestamp: now };
  return session;
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token: { in: [token, hashSessionToken(token)] } },
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
 * Delete all sessions for a user (useful for logout from all devices)
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Sign out the current user
 * @param deleteAllDevices - If true, deletes all sessions for this user (logout from all devices)
 */
export async function signOut(deleteAllDevices: boolean = false): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  if (deleteAllDevices) {
    // Delete ALL sessions for this user (logout from all devices)
    await deleteAllUserSessions(session.userId);
  } else {
    // Only delete the current session
    await deleteSession(session.token);
    // Also clean up old sessions for this user (but keep a few most recent)
    // This prevents accumulation when users log in/out frequently
    cleanupOldSessionsForUser(session.userId, 2).catch(() => {
      // Ignore errors
    });
  }
}

/**
 * Global cleanup function to remove expired sessions and old inactive sessions
 * This can be called periodically (e.g., on startup, via cron job, or scheduled task)
 * 
 * Strategy:
 * - Delete all expired sessions
 * - For each user, keep only their 3 most recent active sessions (used in last 7 days)
 * - Delete all other old sessions
 */
export async function globalSessionCleanup(): Promise<{
  expiredDeleted: number;
  oldDeleted: number;
  totalDeleted: number;
}> {
  try {
    const now = new Date();
    let expiredDeleted = 0;
    let oldDeleted = 0;

    // 1. Delete all expired sessions
    const expiredResult = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
    expiredDeleted = expiredResult.count;

    // 2. Clean up old sessions for each user
    // Get all unique users with active sessions
    const activeSessions = await prisma.session.findMany({
      where: {
        expiresAt: {
          gte: now,
        },
      },
      select: {
        userId: true,
        id: true,
        lastActivityAt: true,
      },
    });

    // Group sessions by user
    const sessionsByUser = new Map<string, typeof activeSessions>();
    activeSessions.forEach((session) => {
      if (!sessionsByUser.has(session.userId)) {
        sessionsByUser.set(session.userId, []);
      }
      sessionsByUser.get(session.userId)!.push(session);
    });

    // Clean up old sessions for each user
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    for (const [, sessions] of sessionsByUser.entries()) {
      // Sort by lastActivityAt (most recent first)
      sessions.sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime()
      );

      // Keep only 3 most recent active sessions (used in last 7 days)
      const recentActive = sessions.filter(
        (s) => new Date(s.lastActivityAt) >= sevenDaysAgo
      );
      const toKeep = recentActive.slice(0, 3);
      const keepIds = new Set(toKeep.map((s) => s.id));

      // Delete old sessions
      const toDelete = sessions
        .filter((s) => !keepIds.has(s.id))
        .map((s) => s.id);

      if (toDelete.length > 0) {
        const deleted = await prisma.session.deleteMany({
          where: {
            id: {
              in: toDelete,
            },
          },
        });
        oldDeleted += deleted.count;
      }
    }

    const totalDeleted = expiredDeleted + oldDeleted;

    return {
      expiredDeleted,
      oldDeleted,
      totalDeleted,
    };
  } catch (_error) {
    return {
      expiredDeleted: 0,
      oldDeleted: 0,
      totalDeleted: 0,
    };
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
