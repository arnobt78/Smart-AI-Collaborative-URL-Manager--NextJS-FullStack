import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PROBE_TIMEOUT_MS = 1000;

/**
 * C7.3 / Track B Wave 1: Lightweight reachability probe.
 * In-process checks only — no self-HTTP to /api/lists or overview (cold ~3.85s).
 */
async function checkProbe(
  name: string,
  endpoint: string,
  handler: () => Promise<{ ok: boolean }>,
): Promise<{
  name: string;
  endpoint: string;
  status: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  try {
    const result = await Promise.race([
      handler(),
      new Promise<{ ok: boolean }>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), PROBE_TIMEOUT_MS),
      ),
    ]);

    const responseTime = Date.now() - startTime;
    return {
      name,
      endpoint,
      status: result.ok ? "operational" : "degraded",
      responseTime,
    };
  } catch {
    const responseTime = Date.now() - startTime;
    return {
      name,
      endpoint,
      status: "degraded",
      responseTime: Math.min(responseTime, PROBE_TIMEOUT_MS),
    };
  }
}

export async function GET(request: NextRequest) {
  void request;
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

    const endpointChecks = await Promise.allSettled([
      checkProbe("Lists API", "/api/lists", async () => {
        await prisma.list.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        return { ok: true };
      }),
      checkProbe("Metadata API", "/api/metadata", async () => {
        await import("@/app/api/metadata/route");
        return { ok: true };
      }),
      checkProbe(
        "Business Insights API",
        "/api/business-insights/overview",
        async () => {
          // Cheap reachability — count only, no full overview scan
          await prisma.list.count({ where: { userId: user.id } });
          return { ok: true };
        },
      ),
      checkProbe("Auth API", "/api/auth/session", async () => {
        // Session already validated via getCurrentUser above
        return { ok: Boolean(user.id) };
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
        responseTime: PROBE_TIMEOUT_MS,
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
