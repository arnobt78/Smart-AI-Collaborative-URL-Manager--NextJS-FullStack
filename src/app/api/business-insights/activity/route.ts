import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildActivityFromLists,
  loadUserInsightLists,
} from "@/lib/business-insights-lists";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // C7.2: shared cached scan (deduped with overview when SSR loads both)
    const lists = await loadUserInsightLists(user.id);
    const activity = buildActivityFromLists(lists, days);

    return NextResponse.json({ activity });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
