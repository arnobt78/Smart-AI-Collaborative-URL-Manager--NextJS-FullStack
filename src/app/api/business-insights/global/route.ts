import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UrlItem } from "@/stores/urlListStore";

export async function GET(_: NextRequest) {
  try {
    // Require authentication to view global stats (optional - you can make this public if needed)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users count
    const totalUsers = await prisma.user.count();

    // Get all lists
    const allLists = await prisma.list.findMany();

    // Calculate total lists
    const totalLists = allLists.length;

    // Calculate total URLs across all lists
    const totalUrls = allLists.reduce((sum, list) => {
      const urls = (list.urls as unknown as UrlItem[]) || [];
      return sum + urls.length;
    }, 0);

    // Get active users (sessions that haven't expired and were actively used in last 15 minutes)
    // We use lastActivityAt which is updated on each authenticated request
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    // Query active sessions with proper typing
    // Note: Using type assertion for lastActivityAt to handle Prisma client type generation
    const activeSessions = await prisma.session.findMany({
      where: {
        expiresAt: {
          gte: new Date(), // Session hasn't expired
        },
        lastActivityAt: { gte: fifteenMinutesAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        lastActivityAt: "desc",
      },
    });
    
    // Filter out sessions that are likely migration artifacts
    // Sessions where lastActivityAt equals createdAt (within 2 minutes) were likely set by migration
    // and haven't been truly used since. Only count sessions that show actual activity.
    const trulyActiveSessions = activeSessions.filter((session) => {
      const createdAt = new Date(session.createdAt).getTime();
      const lastActivityAt = new Date(session.lastActivityAt).getTime();
      const timeDiff = lastActivityAt - createdAt;
      
      // Migration timestamp: approximately when migration ran (2025-11-20 ~13:43)
      const migrationTimestamp = new Date("2025-11-20T13:43:00.000Z").getTime();
      const isPreMigration = createdAt < migrationTimestamp;
      
      // Keep session if:
      // 1. Created recently (within last 24 hours) - definitely active
      // 2. OR lastActivityAt is at least 2 minutes after createdAt - shows actual usage
      // 3. OR session was created after migration (has proper lastActivityAt tracking from start)
      if (Date.now() - createdAt < 24 * 60 * 60 * 1000) {
        // Created within last 24 hours - definitely active
        return true;
      }
      
      if (timeDiff > 120000) {
        // lastActivityAt is at least 2 minutes after createdAt - shows actual activity
        return true;
      }
      
      // For pre-migration sessions, if lastActivityAt is very close to createdAt (within 2 min),
      // it's likely a migration artifact and hasn't been truly used recently
      // Skip these unless they were created after migration
      return !isPreMigration;
    });

    // Get unique user IDs with debug info (using filtered sessions)
    const uniqueUserIds = new Set(trulyActiveSessions.map((s) => s.userId));
    const liveUsersNow = uniqueUserIds.size;

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      const now = new Date();
      console.log("🔍 [LIVE USERS] Active sessions:", {
        totalSessionsFound: activeSessions.length,
        trulyActiveSessions: trulyActiveSessions.length,
        uniqueUsers: liveUsersNow,
        timeWindow: "15 minutes",
        cutoffTime: fifteenMinutesAgo.toISOString(),
        sessions: trulyActiveSessions.map((s) => {
          const createdAt = new Date(s.createdAt).getTime();
          const lastActivityAt = new Date(s.lastActivityAt).getTime();
          const timeDiff = lastActivityAt - createdAt;
          return {
            userId: s.userId,
            email: s.user?.email,
            lastActivityAt: s.lastActivityAt,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            minutesAgo: Math.round(
              (now.getTime() - lastActivityAt) / 60000
            ),
            sessionAgeInDays: Math.round(
              (now.getTime() - createdAt) / (1000 * 60 * 60 * 24)
            ),
            timeSinceCreation: Math.round(timeDiff / 60000) + " minutes",
            isRecentlyCreated:
              Date.now() - createdAt < 24 * 60 * 60 * 1000 ? "Yes" : "No",
          };
        }),
        filteredOut: activeSessions.length - trulyActiveSessions.length,
      });
    }

    // Calculate public vs private lists
    const publicLists = allLists.filter((list) => list.isPublic).length;
    const privateLists = totalLists - publicLists;

    // Calculate lists with collaborators
    const listsWithCollaborators = allLists.filter(
      (list) => (list.collaborators?.length || 0) > 0
    ).length;

    // Calculate average URLs per list
    const avgUrlsPerList =
      totalLists > 0 ? Math.round((totalUrls / totalLists) * 10) / 10 : 0;

    // Get activity in last 7 days (new users, new lists, new URLs)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison

    const newUsersLast7Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const newListsLast7Days = allLists.filter((list) => {
      const listDate = new Date(list.createdAt);
      listDate.setHours(0, 0, 0, 0);
      return listDate >= sevenDaysAgo;
    }).length;

    const newUrlsLast7Days = allLists.reduce((sum, list) => {
      const urls = (list.urls as unknown as UrlItem[]) || [];
      return (
        sum +
        urls.filter((url) => {
          if (!url.createdAt) return false;
          const urlDate = new Date(url.createdAt);
          urlDate.setHours(0, 0, 0, 0);
          return urlDate >= sevenDaysAgo;
        }).length
      );
    }, 0);

    // Get user growth over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersLast30Days = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Calculate daily user signups for last 30 days
    const dailySignups = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      dailySignups.set(dateStr, 0);
    }

    usersLast30Days.forEach((user) => {
      const dateStr = new Date(user.createdAt).toISOString().split("T")[0];
      const count = dailySignups.get(dateStr) || 0;
      dailySignups.set(dateStr, count + 1);
    });

    const userGrowthData = Array.from(dailySignups.entries())
      .map(([date, count]) => ({ date, users: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      global: {
        totalUsers,
        totalLists,
        totalUrls,
        liveUsersNow,
        publicLists,
        privateLists,
        listsWithCollaborators,
        avgUrlsPerList,
        newUsersLast7Days,
        newListsLast7Days,
        newUrlsLast7Days,
        userGrowthData,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch global stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
