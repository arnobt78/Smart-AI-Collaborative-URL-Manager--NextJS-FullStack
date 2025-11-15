import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UrlItem } from "@/lib/db";

// Helper function to check an endpoint by calling the handler directly
async function checkEndpoint(
  name: string,
  endpoint: string,
  handler: () => Promise<Response>
): Promise<{
  name: string;
  endpoint: string;
  status: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await Promise.race([
      handler(),
      new Promise<Response>((_, reject) =>
        setTimeout(() => {
          controller.abort();
          reject(new Error("Timeout"));
        }, 5000)
      ),
    ]);

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // Even if it returns an error (like 401), it means the endpoint is reachable
    const status = response.status < 500 ? "operational" : "degraded";

    return {
      name,
      endpoint,
      status,
      responseTime,
    };
  } catch {
    const responseTime = Date.now() - startTime;
    // If timeout or error, mark as degraded
    return {
      name,
      endpoint,
      status: "degraded",
      responseTime: responseTime > 5000 ? 5000 : responseTime, // Cap at timeout
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check database connection
    let dbStatus = "operational";
    let dbResponseTime = 0;
    try {
      const dbStartTime = Date.now();
      await prisma.user.findFirst();
      dbResponseTime = Date.now() - dbStartTime;
    } catch {
      dbStatus = "degraded";
    }

    // Get base URL dynamically (works for both localhost and production)
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      req.nextUrl.origin;

    // Base URL is already determined dynamically above
    // Production URL: https://daily-urlist.vercel.app
    // Development URL: http://localhost:3000 (from NEXT_PUBLIC_BASE_URL)

    // Import and test API handlers directly (more accurate than HTTP requests)
    const endpointChecks = await Promise.allSettled([
      checkEndpoint("Lists API", "/api/lists", async () => {
        try {
          // Simulate a quick check - in production you might want to actually call the handler
          // For now, we'll do a lightweight check
          const response = await fetch(`${baseUrl}/api/lists`, {
            method: "GET",
            headers: req.headers,
          });
          return response;
        } catch {
          return new Response(null, { status: 500 });
        }
      }),
      checkEndpoint("Metadata API", "/api/metadata", async () => {
        try {
          // Test with a real URL from the user's actual project data
          // This makes the status check dynamic and based on actual project activities
          let testUrl = "https://example.com"; // Fallback if no URLs exist

          try {
            // Try to get a real URL from the user's lists
            const lists = await prisma.list.findMany({
              where: { userId: user.id },
              take: 1,
              orderBy: { updatedAt: "desc" },
            });

            if (lists.length > 0 && lists[0].urls) {
              const urls = lists[0].urls as unknown as UrlItem[];
              if (urls.length > 0 && urls[0]?.url) {
                testUrl = urls[0].url;
              }
            }
          } catch {
            // If we can't fetch user data, use fallback
            testUrl = "https://example.com";
          }

          const response = await fetch(
            `${baseUrl}/api/metadata?url=${encodeURIComponent(testUrl)}`,
            {
              method: "GET",
              signal: AbortSignal.timeout(5000), // 5 second timeout - reasonable for metadata extraction
            }
          );
          return response;
        } catch {
          return new Response(null, { status: 500 });
        }
      }),
      checkEndpoint(
        "Business Insights API",
        "/api/business-insights/overview",
        async () => {
          try {
            const response = await fetch(
              `${baseUrl}/api/business-insights/overview`,
              {
                method: "GET",
                headers: req.headers,
              }
            );
            return response;
          } catch {
            return new Response(null, { status: 500 });
          }
        }
      ),
      checkEndpoint("Auth API", "/api/auth/session", async () => {
        try {
          const response = await fetch(`${baseUrl}/api/auth/session`, {
            method: "GET",
            headers: req.headers,
          });
          return response;
        } catch {
          return new Response(null, { status: 500 });
        }
      }),
    ]);

    // Process results
    const endpoints = endpointChecks.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // Fallback for failed checks
        const endpointNames = [
          { name: "Lists API", endpoint: "/api/lists" },
          { name: "Metadata API", endpoint: "/api/metadata" },
          {
            name: "Business Insights API",
            endpoint: "/api/business-insights/overview",
          },
          { name: "Auth API", endpoint: "/api/auth/session" },
        ];
        return {
          ...endpointNames[index],
          status: "degraded",
          responseTime: 5000,
        };
      }
    });

    const overallStatus =
      dbStatus === "operational" &&
      endpoints.every((ep) => ep.status === "operational")
        ? "operational"
        : "degraded";

    return NextResponse.json({
      status: {
        overall: overallStatus,
        database: dbStatus,
        databaseResponseTime: dbResponseTime,
        uptime: process.uptime(), // Node.js process uptime in seconds
        timestamp: new Date().toISOString(),
      },
      endpoints,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
