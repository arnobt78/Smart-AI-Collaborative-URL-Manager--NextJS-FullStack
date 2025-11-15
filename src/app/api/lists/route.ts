import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserLists, createList as createListDB } from "@/lib/db";

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, slug, urls, isPublic } = body;

    const list = await createListDB({
      title,
      description,
      slug,
      urls: urls || [],
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
