import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getListById } from "@/lib/db";
import type { UrlItem } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; urlId: string }>
      | { id: string; urlId: string };
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const listId = resolvedParams.id;
    const urlId = resolvedParams.urlId;

    // Get the list and verify ownership
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user owns the list or is a collaborator
    const isOwner = list.userId === user.id;
    const isCollaborator =
      list.collaborators && list.collaborators.includes(user.email);
    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the URL's clickCount
    const urls = (list.urls as unknown as UrlItem[]) || [];
    const urlIndex = urls.findIndex((url) => url.id === urlId);

    if (urlIndex === -1) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Increment clickCount (initialize to 1 if undefined)
    const updatedUrls = [...urls];
    updatedUrls[urlIndex] = {
      ...updatedUrls[urlIndex],
      clickCount: (updatedUrls[urlIndex].clickCount || 0) + 1,
    };

    // Update the list
    const updatedList = await prisma.list.update({
      where: { id: listId },
      data: { urls: updatedUrls as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      success: true,
      clickCount: updatedUrls[urlIndex].clickCount,
      list: updatedList,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to track URL click";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
