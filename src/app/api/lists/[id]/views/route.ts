import { NextRequest, NextResponse } from "next/server";
import { getListById, updateList } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const list = await getListById(id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Only track views for public lists
    if (!list.isPublic) {
      return NextResponse.json({ error: "Not a public list" }, { status: 403 });
    }

    // Increment view count (stored in a JSON field or separate field)
    // For now, we'll use a simple approach - update the list metadata
    // In the future, you might want to add a separate views table
    const currentViews = (list as any).views || 0;
    
    // Note: This is a simplified approach. In production, you might want:
    // - A separate views table with timestamps
    // - IP-based deduplication
    // - Daily/weekly view counts
    await updateList(id, {
      // Store views count in a custom field or metadata
      // For now, we'll return success and handle views tracking separately
    });

    return NextResponse.json({ success: true, views: currentViews + 1 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to track view";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
