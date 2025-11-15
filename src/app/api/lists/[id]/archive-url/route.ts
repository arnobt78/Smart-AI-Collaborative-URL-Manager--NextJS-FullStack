import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById, updateList } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { urls, archivedUrls } = await req.json();

    const list = await getListById(id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this list" },
        { status: 403 }
      );
    }

    // Get existing values from database
    // Handle case where archivedUrls might not exist in database yet (before migration)
    const existingUrls = Array.isArray(list.urls) ? list.urls : [];
    const existingArchivedUrls = Array.isArray((list as any).archivedUrls) 
      ? (list as any).archivedUrls 
      : [];

    const updatePayload: {
      urls?: any;
      archivedUrls?: any;
    } = {};

    if (urls !== undefined) {
      updatePayload.urls = urls;
    } else if (existingUrls.length > 0) {
      updatePayload.urls = existingUrls;
    }

    if (archivedUrls !== undefined) {
      updatePayload.archivedUrls = archivedUrls;
    } else {
      updatePayload.archivedUrls = existingArchivedUrls;
    }

    await updateList(id, updatePayload);

    const updatedList = await getListById(id);
    return NextResponse.json({ list: updatedList });
  } catch (error) {
    console.error("Error in archive-url route:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update list";
    return NextResponse.json(
      { error: message, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
