import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildOverviewFromLists,
  loadUserInsightLists,
} from "@/lib/business-insights-lists";

export async function GET(_: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // C7.2: shared cached scan (deduped with activity when SSR loads both)
    const lists = await loadUserInsightLists(user.id);
    const overview = buildOverviewFromLists(lists);

    return NextResponse.json({ overview });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
