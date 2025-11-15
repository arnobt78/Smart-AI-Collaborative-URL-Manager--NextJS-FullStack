import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
      const urls = (list.urls as any[]) || [];
      return sum + urls.length;
    }, 0);

    // Get active users (sessions that haven't expired and were created in last 15 minutes)
    // Note: We use createdAt since sessions don't have updatedAt. For more accurate tracking,
    // you could implement a heartbeat system that updates session timestamps.
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const activeSessions = await prisma.session.findMany({
      where: {
        expiresAt: {
          gte: new Date(), // Session hasn't expired
        },
        createdAt: {
          gte: fifteenMinutesAgo, // Session was created in last 15 minutes
        },
      },
      select: {
        userId: true,
      },
    });

    // Get unique user IDs
    const uniqueUserIds = new Set(activeSessions.map((s) => s.userId));
    const liveUsersNow = uniqueUserIds.size;

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
      const urls = (list.urls as any[]) || [];
      return (
        sum +
        urls.filter((url: any) => {
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
