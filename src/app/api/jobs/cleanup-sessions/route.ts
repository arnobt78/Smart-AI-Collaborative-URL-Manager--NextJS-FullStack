import { NextRequest, NextResponse } from "next/server";
import { globalSessionCleanup } from "@/lib/auth";
import { isAuthorizedInternalJob } from "@/lib/jobs/authorization";

/**
 * Check if request is authorized
 * In development: allow without auth for testing
 * In production: require auth or API key
 */
/**
 * Cleanup endpoint for sessions
 * Can be called periodically (via cron, scheduled job, or manually)
 * Cleans up expired sessions and old inactive sessions
 */
export async function POST(req: NextRequest) {
  try {
    // Check authorization
    if (!(await isAuthorizedInternalJob(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Run global session cleanup
    const result = await globalSessionCleanup();

    return NextResponse.json({
      success: true,
      cleanup: result,
      message: `Cleaned up ${result.totalDeleted} sessions (${result.expiredDeleted} expired, ${result.oldDeleted} old inactive)`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cleanup sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET endpoint for manual testing/verification
 */
export async function GET(req: NextRequest) {
  try {
    // Check authorization
    if (!(await isAuthorizedInternalJob(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Run global session cleanup
    const result = await globalSessionCleanup();

    return NextResponse.json({
      success: true,
      cleanup: result,
      message: `Cleaned up ${result.totalDeleted} sessions (${result.expiredDeleted} expired, ${result.oldDeleted} old inactive)`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cleanup sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
