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

    // If positions were initialized, save them back to database
    if (needsPositionInit && urlsWithPositions.length > 0) {
      await updateList(list.id, { urls: urlsWithPositions });
      list.urls = urlsWithPositions as any;
    } else {
      // Always update list.urls to the sorted version (even if positions existed)
      list.urls = urlsWithPositions as any;
    }

    // Get activities
    const activities = await getActivitiesForList(list.id, activityLimit);

    // Get collaborators (if user has access) - same access logic as /collaborators endpoint
    let collaborators: Array<{ email: string; role: "editor" | "viewer" }> = [];
    try {
      // Owner can always view collaborators
      if (list.userId === user.id) {
        collaborators = await getCollaboratorsWithRoles(list.id);
      } else if (list.collaboratorRoles && typeof list.collaboratorRoles === "object") {
        // Check if user is a collaborator (editor or viewer can view)
        const roles = list.collaboratorRoles as Record<string, string>;
        if (roles[user.email] === "editor" || roles[user.email] === "viewer") {
          collaborators = await getCollaboratorsWithRoles(list.id);
        }
      } else if (list.collaborators && Array.isArray(list.collaborators) && list.collaborators.includes(user.email)) {
        // Fallback: Check legacy collaborators array
        collaborators = await getCollaboratorsWithRoles(list.id);
      } else if (list.isPublic) {
        // Public list - allow viewing collaborators
        collaborators = await getCollaboratorsWithRoles(list.id);
      }
      // Otherwise: No access - collaborators array remains empty
    } catch (error) {
      // If collaborator fetch fails, continue without them (non-critical)
      console.warn("Failed to fetch collaborators in unified endpoint:", error);
    }

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
      activities,
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

