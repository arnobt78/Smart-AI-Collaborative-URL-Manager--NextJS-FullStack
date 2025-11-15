import { Client } from "@upstash/qstash";

let qstashClient: Client | null = null;

if (process.env.QSTASH_TOKEN) {
  qstashClient = new Client({
    token: process.env.QSTASH_TOKEN,
  });
}

export { qstashClient };

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
 * Schedule a URL health check job for a specific list
 */
export async function scheduleUrlHealthCheck(listId: string): Promise<void> {
  if (!qstashClient) {
    console.warn("⚠️ [QSTASH] QStash client not configured, skipping health check scheduling");
    return;
  }

  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/jobs/check-urls`;

  try {
    await qstashClient.publish({
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listId }),
    });
    console.log(`✅ [QSTASH] Scheduled health check for list ${listId}`);
  } catch (error) {
    console.error("❌ [QSTASH] Failed to schedule health check:", error);
    throw error;
  }
}

/**
 * Schedule a metadata refresh job for a specific list
 */
export async function scheduleMetadataRefresh(listId: string): Promise<void> {
  if (!qstashClient) {
    console.warn("⚠️ [QSTASH] QStash client not configured, skipping metadata refresh scheduling");
    return;
  }

  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/jobs/refresh-metadata`;

  try {
    await qstashClient.publish({
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listId }),
    });
    console.log(`✅ [QSTASH] Scheduled metadata refresh for list ${listId}`);
  } catch (error) {
    console.error("❌ [QSTASH] Failed to schedule metadata refresh:", error);
    throw error;
  }
}

/**
 * Schedule a daily health check for all lists (called via cron)
 * This should be scheduled to run daily via QStash cron
 */
export async function scheduleDailyHealthChecks(): Promise<void> {
  if (!qstashClient) {
    console.warn("⚠️ [QSTASH] QStash client not configured");
    return;
  }

  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/jobs/check-all-urls`;

  try {
    // Schedule with cron: "0 2 * * *" = daily at 2 AM UTC
    await qstashClient.publish({
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
      },
      cron: "0 2 * * *", // Daily at 2 AM UTC
    });
    console.log("✅ [QSTASH] Scheduled daily health checks (cron: 0 2 * * *)");
  } catch (error) {
    console.error("❌ [QSTASH] Failed to schedule daily health checks:", error);
    throw error;
  }
}

/**
 * Schedule a weekly metadata refresh for all lists
 */
export async function scheduleWeeklyMetadataRefresh(): Promise<void> {
  if (!qstashClient) {
    console.warn("⚠️ [QSTASH] QStash client not configured");
    return;
  }

  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/jobs/refresh-all-metadata`;

  try {
    // Schedule with cron: "0 3 * * 0" = weekly on Sunday at 3 AM UTC
    await qstashClient.publish({
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
      },
      cron: "0 3 * * 0", // Weekly on Sunday at 3 AM UTC
    });
    console.log("✅ [QSTASH] Scheduled weekly metadata refresh (cron: 0 3 * * 0)");
  } catch (error) {
    console.error("❌ [QSTASH] Failed to schedule weekly metadata refresh:", error);
    throw error;
  }
}

