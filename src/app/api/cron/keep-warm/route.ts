import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/realtime/redis";
import { isAuthorizedInternalJob } from "@/lib/jobs/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Free-tier keep-warm ping (Phase C).
 * Touches Prisma + Redis lightly so Hobby serverless is less often cold.
 * Does NOT guarantee absolute `_rsc` ms SLAs (RISK-0033).
 *
 * Auth: same as internal jobs (`x-internal-job-secret` / QStash / dev open).
 */
async function ping() {
  const [dbOk, redisOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1 AS ok`.then(() => true).catch(() => false),
    redis
      ? redis.ping().then(() => true).catch(() => false)
      : Promise.resolve(false),
  ]);

  return {
    ok: dbOk,
    db: dbOk,
    redis: redisOk,
    at: new Date().toISOString(),
    note: "Warm ping only — not an absolute cold-start SLA",
  };
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorizedInternalJob(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await ping();
  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorizedInternalJob(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await ping();
  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
