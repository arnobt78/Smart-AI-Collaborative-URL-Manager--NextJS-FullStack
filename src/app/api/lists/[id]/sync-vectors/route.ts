import { NextRequest, NextResponse } from "next/server";
import { getListById } from "@/lib/db";
import { upsertUrlVectors } from "@/lib/vector";
import type { UrlItem } from "@/stores/urlListStore";

/**
 * Sync all URLs from a list to the vector database
 * This is useful for populating vectors for existing URLs
 */
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

    const urls = (list.urls as unknown as UrlItem[]) || [];

    if (urls.length === 0) {
      console.log(`ℹ️ [VECTOR SYNC] No URLs to sync for list ${id}`);
      return NextResponse.json({
        success: true,
        message: "No URLs to sync",
        synced: 0,
      });
    }

    console.log(
      `🔄 [VECTOR SYNC] Starting sync for ${urls.length} URLs in list ${id}`
    );
    // Sync all URLs to vector database
    await upsertUrlVectors(urls, id);

    return NextResponse.json({
      success: true,
      message: `Synced ${urls.length} URLs to vector database`,
      synced: urls.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync vectors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
