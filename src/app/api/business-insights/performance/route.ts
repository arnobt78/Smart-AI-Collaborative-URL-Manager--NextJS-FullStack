import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lists = await prisma.list.findMany({
      where: { userId: user.id },
    });

    // Calculate performance metrics
    const totalUrls = lists.reduce((sum, list) => {
      return sum + ((list.urls as any[])?.length || 0);
    }, 0);

    const avgUrlsPerList = lists.length > 0 ? totalUrls / lists.length : 0;

    // Lists with most URLs
    const listsBySize = lists
      .map((list) => ({
        slug: list.slug,
        title: list.title,
        urlCount: (list.urls as any[])?.length || 0,
      }))
      .sort((a, b) => b.urlCount - a.urlCount)
      .slice(0, 5);

    // Public vs Private distribution
    const publicCount = lists.filter((list) => list.isPublic).length;
    const privateCount = lists.length - publicCount;

    // Lists with collaborators
    const listsWithCollaborators = lists.filter(
      (list) => (list.collaborators?.length || 0) > 0
    ).length;

    return NextResponse.json({
      performance: {
        totalUrls,
        totalLists: lists.length,
        avgUrlsPerList: Math.round(avgUrlsPerList * 10) / 10,
        publicCount,
        privateCount,
        listsWithCollaborators,
        topLists: listsBySize,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch performance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
