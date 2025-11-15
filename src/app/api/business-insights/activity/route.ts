import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Get activity for last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get ALL user's lists (not just created in period, because URLs can be added to old lists)
    const lists = await prisma.list.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
    });

    // Create daily activity data map
    const activityMap = new Map<string, { lists: number; urls: number }>();

    // Initialize all dates in range with zeros
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      activityMap.set(dateStr, { lists: 0, urls: 0 });
    }

    // Track lists created in the period
    lists.forEach((list) => {
      const listDate = new Date(list.createdAt);
      listDate.setHours(0, 0, 0, 0);
      const dateStr = listDate.toISOString().split("T")[0];

      // Only count if within the date range
      if (listDate >= startDate) {
        const existing = activityMap.get(dateStr) || { lists: 0, urls: 0 };
        activityMap.set(dateStr, {
          lists: existing.lists + 1,
          urls: existing.urls,
        });
      }

      // Track URLs added in the period (based on URL createdAt)
      const urls = (list.urls as any[]) || [];
      urls.forEach((url: any) => {
        if (url.createdAt) {
          const urlDate = new Date(url.createdAt);
          urlDate.setHours(0, 0, 0, 0);
          const urlDateStr = urlDate.toISOString().split("T")[0];

          // Only count if within the date range
          if (urlDate >= startDate) {
            const existing = activityMap.get(urlDateStr) || {
              lists: 0,
              urls: 0,
            };
            activityMap.set(urlDateStr, {
              lists: existing.lists,
              urls: existing.urls + 1,
            });
          }
        }
      });
    });

    // Convert map to array and sort by date (oldest to newest)
    const activityData: Array<{ date: string; lists: number; urls: number }> =
      [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      const data = activityMap.get(dateStr) || { lists: 0, urls: 0 };
      activityData.push({
        date: dateStr,
        ...data,
      });
    }

    return NextResponse.json({ activity: activityData });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
