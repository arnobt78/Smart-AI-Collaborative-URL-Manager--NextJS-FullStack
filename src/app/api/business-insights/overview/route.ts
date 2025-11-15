import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's lists
    const lists = await prisma.list.findMany({
      where: { userId: user.id },
    });

    // Calculate statistics
    const totalLists = lists.length;
    const totalUrls = lists.reduce((sum, list) => {
      const urls = (list.urls as any[]) || [];
      return sum + urls.length;
    }, 0);

    const publicLists = lists.filter((list) => list.isPublic).length;
    const privateLists = totalLists - publicLists;

    const totalCollaborators = lists.reduce((sum, list) => {
      return sum + (list.collaborators?.length || 0);
    }, 0);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLists = lists.filter(
      (list) => new Date(list.createdAt) >= sevenDaysAgo
    ).length;

    // Get URLs added in last 7 days
    const recentUrls = lists.reduce((sum, list) => {
      const urls = (list.urls as any[]) || [];
      return (
        sum +
        urls.filter((url) => {
          const urlDate = new Date(url.createdAt);
          return urlDate >= sevenDaysAgo;
        }).length
      );
    }, 0);

    return NextResponse.json({
      overview: {
        totalLists,
        totalUrls,
        publicLists,
        privateLists,
        totalCollaborators,
        recentLists,
        recentUrls,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
