import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserLists, createList as createListDB } from "@/lib/db";
import type { UrlItem } from "@/lib/db";
import { listCreateSchema, parseJsonBody } from "@/lib/api-validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lists = await getUserLists(user.id);
    return NextResponse.json({ lists });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch lists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, listCreateSchema);
    if (!parsed.success) return parsed.response;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, slug, urls, isPublic } = parsed.data;

    const list = await createListDB({
      title,
      description: description ?? undefined,
      slug,
      urls: (urls ?? []) as UrlItem[],
      isPublic: isPublic || false,
      userId: user.id,
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
