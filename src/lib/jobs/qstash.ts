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
  } catch (error) {
    throw error;
  }
}

/**
 * Schedule a metadata refresh job for a specific list
 */
export async function scheduleMetadataRefresh(listId: string): Promise<void> {
  if (!qstashClient) {
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
  } catch (error) {
    throw error;
  }
}

/**
 * Schedule a daily health check for all lists (called via cron)
 * This should be scheduled to run daily via QStash cron
 */
export async function scheduleDailyHealthChecks(): Promise<void> {
  if (!qstashClient) {
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
  } catch (error) {
    throw error;
  }
}

/**
 * Schedule a weekly metadata refresh for all lists
 */
export async function scheduleWeeklyMetadataRefresh(): Promise<void> {
  if (!qstashClient) {
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
  } catch (error) {
    throw error;
  }
}

