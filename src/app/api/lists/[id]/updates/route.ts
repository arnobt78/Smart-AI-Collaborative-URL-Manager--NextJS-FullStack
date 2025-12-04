import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlug, updateList, getCollaboratorsWithRoles, type UrlItem } from "@/lib/db";
import { getActivitiesForList } from "@/lib/db/activities";
import { hasListAccess } from "@/lib/collaboration/permissions";

/**
 * GET /api/lists/[id]/updates
 * UNIFIED ENDPOINT: Returns both list data and activities in a single call
 * This eliminates the need for separate API calls and ensures consistency
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const activityLimit = parseInt(searchParams.get("activityLimit") || "30", 10);

    const list = await getListBySlug(id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check if user has access to this list
    const user = await getCurrentUser();
    const hasAccess = await hasListAccess(list, user);

    if (!hasAccess || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize positions for URLs that don't have them (backward compatibility)
    const urls = (list.urls as unknown as UrlItem[]) || [];
    let needsPositionInit = false;

    const urlsWithPositions: UrlItem[] = urls.map((url, idx) => {
      if (url.position === undefined) {
        needsPositionInit = true;
        return { ...url, position: idx };
      }
      return url;
    });

    // CRITICAL: ALWAYS sort by position to ensure correct order (especially after reorder operations)
    // Sort by position to ensure URLs are in the correct order from database
    urlsWithPositions.sort(
      (a, b) => (a.position ?? 999) - (b.position ?? 999)
    );

    // Always update list.urls to the sorted version
    list.urls = urlsWithPositions as any;

    // OPTIMIZATION: Run position initialization (if needed), activities, and collaborators queries in PARALLEL
    // Determine if user can access collaborators first (synchronous check, no DB query)
    const canViewCollaborators = 
      list.userId === user.id || // Owner can always view
      (list.collaboratorRoles && typeof list.collaboratorRoles === "object" && 
       ((list.collaboratorRoles as Record<string, string>)[user.email] === "editor" || 
        (list.collaboratorRoles as Record<string, string>)[user.email] === "viewer")) || // Collaborator can view
      (list.collaborators && Array.isArray(list.collaborators) && list.collaborators.includes(user.email)) || // Legacy check
      list.isPublic; // Public list

    // Run ALL queries in parallel (much faster than sequential)
    // Position init is non-blocking - response returns immediately, position save happens in background
    const [positionInitResult, activitiesResult, collaboratorsResult] = await Promise.allSettled([
      // Position initialization (only if needed) - non-blocking
      needsPositionInit && urlsWithPositions.length > 0
        ? updateList(list.id, { urls: urlsWithPositions })
        : Promise.resolve(null),
      // Activities fetch
      getActivitiesForList(list.id, activityLimit),
      // Collaborators fetch (only if user has access)
      canViewCollaborators 
        ? getCollaboratorsWithRoles(list.id)
        : Promise.resolve([] as Array<{ email: string; role: "editor" | "viewer" }>),
    ]);

    // Extract results safely
    // Note: Position init result is ignored - it's a background operation
    if (positionInitResult.status === "rejected") {
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to initialize positions (non-critical):", positionInitResult.reason);
      }
    }

    const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value : [];
    const collaborators: Array<{ email: string; role: "editor" | "viewer" }> = 
      collaboratorsResult.status === "fulfilled" 
        ? collaboratorsResult.value 
        : (() => {
            // If collaborator fetch fails, log but continue without them (non-critical)
            if (process.env.NODE_ENV === "development") {
              console.warn("Failed to fetch collaborators in unified endpoint:", collaboratorsResult.reason);
            }
            return [];
          })();

    const urlOrder = urlsWithPositions.map((u) => u.id).join(",");
    const clickCounts = urlsWithPositions.map((u) => ({
      urlId: u.id,
      clickCount: u.clickCount || 0,
    }));

    // Return unified response with list, activities, and collaborators
    // Format matches what getList expects for list, ActivityFeed expects for activities,
    // and PermissionManager expects for collaborators
    return NextResponse.json({
      list,
      activities, // Fixed: was using undefined variable
      collaborators,
      urlOrder,
      clickCounts,
    });
  } catch (error) {
    console.error("❌ [UNIFIED] Failed to get updates:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get updates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

