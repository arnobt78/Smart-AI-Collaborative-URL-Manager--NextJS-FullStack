import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * C7.3: Lightweight reachability probe — no external metadata URL fetch
 * (that dominated ~3s wall time on SSR). Keeps status + endpoints[] shape.
 */
async function checkEndpoint(
  name: string,
  endpoint: string,
  handler: () => Promise<Response>,
): Promise<{
  name: string;
  endpoint: string;
  status: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  try {
    const response = await Promise.race([
      handler(),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000),
      ),
    ]);

    const responseTime = Date.now() - startTime;
    const status = response.status < 500 ? "operational" : "degraded";

    return { name, endpoint, status, responseTime };
  } catch {
    const responseTime = Date.now() - startTime;
    return {
      name,
      endpoint,
      status: "degraded",
      responseTime: Math.min(responseTime, 3000),
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let dbStatus = "operational";
    let dbResponseTime = 0;
    try {
      const dbStartTime = Date.now();
      await prisma.user.findFirst({ select: { id: true } });
      dbResponseTime = Date.now() - dbStartTime;
    } catch {
      dbStatus = "degraded";
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      req.nextUrl.origin;

    const cookieHeader = req.headers.get("cookie") || "";

    // C7.3: lists + overview + session only — metadata external probe removed
    const endpointChecks = await Promise.allSettled([
      checkEndpoint("Lists API", "/api/lists", async () => {
        try {
          return await fetch(`${baseUrl}/api/lists`, {
            method: "GET",
            headers: { cookie: cookieHeader },
          });
        } catch {
          return new Response(null, { status: 500 });
        }
      }),
      checkEndpoint("Metadata API", "/api/metadata", async () => {
        // No network: route is configured / importable — avoid 5s external fetch
        try {
          await import("@/app/api/metadata/route");
          return new Response(null, { status: 200 });
        } catch {
          return new Response(null, { status: 500 });
        }
      }),
      checkEndpoint(
        "Business Insights API",
        "/api/business-insights/overview",
        async () => {
          try {
            return await fetch(`${baseUrl}/api/business-insights/overview`, {
              method: "GET",
              headers: { cookie: cookieHeader },
            });
          } catch {
            return new Response(null, { status: 500 });
          }
        },
      ),
      checkEndpoint("Auth API", "/api/auth/session", async () => {
        try {
          return await fetch(`${baseUrl}/api/auth/session`, {
            method: "GET",
            headers: { cookie: cookieHeader },
          });
        } catch {
          return new Response(null, { status: 500 });
        }
      }),
    ]);

    const endpointNames = [
      { name: "Lists API", endpoint: "/api/lists" },
      { name: "Metadata API", endpoint: "/api/metadata" },
      {
        name: "Business Insights API",
        endpoint: "/api/business-insights/overview",
      },
      { name: "Auth API", endpoint: "/api/auth/session" },
    ];

    const endpoints = endpointChecks.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        ...endpointNames[index],
        status: "degraded",
        responseTime: 3000,
      };
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
        uptime: process.uptime(),
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
