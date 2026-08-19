import { NextRequest, NextResponse } from "next/server";
import { upsertUrlVectors } from "@/lib/vector";
import type { UrlItem } from "@/stores/urlListStore";
import { resolveAuthorizedList } from "@/lib/list-route-access";

/**
 * Sync all URLs from a list to the vector database
 * This is useful for populating vectors for existing URLs
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await resolveAuthorizedList(id, "edit");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const list = access.list;

    const urls = (list.urls as unknown as UrlItem[]) || [];

    if (urls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No URLs to sync",
        synced: 0,
      });
    }

    // Sync all URLs to vector database
    await upsertUrlVectors(urls, list.id);

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
