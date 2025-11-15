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

    // Collect all URLs with their lists and calculate popularity score
    const urlList: Array<{
      id: string;
      url: string;
      title?: string;
      listTitle: string;
      listSlug: string;
      isFavorite: boolean;
      createdAt: string;
      clickCount: number;
      popularityScore: number;
    }> = [];

    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    lists.forEach((list) => {
      const urls = (list.urls as any[]) || [];
      urls.forEach((url: any) => {
        const clickCount = url.clickCount || 0;
        const isFavorite = url.isFavorite || false;
        const createdAt = new Date(url.createdAt).getTime();
        const daysSinceCreation = (now - createdAt) / oneDayInMs;

        // Calculate popularity score:
        // - Favorites get a base score of 100
        // - Each click adds 10 points
        // - Recency boost: URLs created in last 7 days get up to 30 points (decreases linearly)
        // - URLs created in last 30 days get up to 15 points
        let popularityScore = 0;

        // Favorite bonus
        if (isFavorite) {
          popularityScore += 100;
        }

        // Click count bonus (10 points per click, capped at 100 points)
        popularityScore += Math.min(clickCount * 10, 100);

        // Recency bonus
        if (daysSinceCreation <= 7) {
          // Up to 30 points for URLs created in last 7 days
          popularityScore += 30 * (1 - daysSinceCreation / 7);
        } else if (daysSinceCreation <= 30) {
          // Up to 15 points for URLs created in last 30 days
          popularityScore += 15 * (1 - (daysSinceCreation - 7) / 23);
        }

        urlList.push({
          id: url.id,
          url: url.url,
          title: url.title,
          listTitle: list.title,
          listSlug: list.slug,
          isFavorite,
          createdAt: url.createdAt,
          clickCount,
          popularityScore,
        });
      });
    });

    // Sort by popularity score (highest first), then by creation date (newest first)
    const popularUrls = urlList
      .sort((a, b) => {
        // First sort by popularity score
        if (b.popularityScore !== a.popularityScore) {
          return b.popularityScore - a.popularityScore;
        }
        // If scores are equal, sort by creation date (newest first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 10);

    // Most active lists (by URL count)
    const activeLists = lists
      .map((list) => ({
        id: list.id,
        title: list.title,
        slug: list.slug,
        urlCount: (list.urls as any[])?.length || 0,
        isPublic: list.isPublic,
        collaborators: list.collaborators?.length || 0,
        updatedAt: list.updatedAt,
      }))
      .sort((a, b) => b.urlCount - a.urlCount)
      .slice(0, 10);

    return NextResponse.json({
      popularUrls: popularUrls.map(({ popularityScore, ...url }) => url), // Remove score from response
      activeLists,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch popular data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
