import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPublicListCards } from "@/lib/db";
import { toListCardSummary } from "@/lib/list-card-dto";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";

    // Wave 3: count-only DB read — no urls jsonb into Node
    const { lists, pagination } = await getPublicListCards({
      page,
      limit,
      search,
    });

    return NextResponse.json({
      lists: lists.map(toListCardSummary),
      pagination,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch public lists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
