import { NextRequest, NextResponse } from "next/server";
import {
  scheduleDailyHealthChecks,
  scheduleWeeklyMetadataRefresh,
} from "@/lib/jobs/qstash";

/**
 * Get the base URL for the application
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Check if we're in a local development environment
 */
function isLocalDevelopment(): boolean {
  const baseUrl = getBaseUrl();
  return (
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    baseUrl.includes("::1")
  );
}

/**
 * POST /api/jobs/setup-schedule
 * Initialize scheduled jobs in QStash
 * Call this endpoint once to set up the cron jobs
 * Note: QStash requires a publicly accessible URL (not localhost)
 */
export async function POST(_request: NextRequest) {
  try {
    // Check if we're in local development
    if (isLocalDevelopment()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Scheduled jobs cannot be set up in local development. QStash requires a publicly accessible URL.",
          localDevelopment: true,
          instructions: {
            manualSetup:
              "To set up scheduled jobs, you have two options:",
            option1:
              "1. Deploy to production and run this setup from there",
            option2:
              "2. Manually create schedules in QStash dashboard with these endpoints:",
            endpoints: [
              {
                name: "Daily Health Checks",
                url: `${getBaseUrl()}/api/jobs/check-all-urls`,
                method: "POST",
                cron: "0 2 * * *",
                description: "Daily at 2 AM UTC",
              },
              {
                name: "Weekly Metadata Refresh",
                url: `${getBaseUrl()}/api/jobs/refresh-all-metadata`,
                method: "POST",
                cron: "0 3 * * 0",
                description: "Sunday at 3 AM UTC",
              },
            ],
          },
        },
        { status: 400 }
      );
    }

    console.log("🔧 [SCHEDULE SETUP] Setting up scheduled jobs...");

    const results = {
      dailyHealthChecks: false,
      weeklyMetadataRefresh: false,
      errors: [] as string[],
    };

    // Schedule daily health checks
    try {
      await scheduleDailyHealthChecks();
      results.dailyHealthChecks = true;
      console.log("✅ [SCHEDULE SETUP] Daily health checks scheduled");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`Daily health checks: ${errorMessage}`);
      console.error(
        "❌ [SCHEDULE SETUP] Failed to schedule daily health checks:",
        error
      );
    }

    // Schedule weekly metadata refresh
    try {
      await scheduleWeeklyMetadataRefresh();
      results.weeklyMetadataRefresh = true;
      console.log("✅ [SCHEDULE SETUP] Weekly metadata refresh scheduled");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`Weekly metadata refresh: ${errorMessage}`);
      console.error(
        "❌ [SCHEDULE SETUP] Failed to schedule weekly metadata refresh:",
        error
      );
    }

    if (results.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Some jobs failed to schedule",
          results,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scheduled jobs initialized successfully",
      results: {
        dailyHealthChecks: "Scheduled (cron: 0 2 * * * - Daily at 2 AM UTC)",
        weeklyMetadataRefresh:
          "Scheduled (cron: 0 3 * * 0 - Sunday at 3 AM UTC)",
      },
    });
  } catch (error) {
    console.error("❌ [SCHEDULE SETUP] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to setup schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

