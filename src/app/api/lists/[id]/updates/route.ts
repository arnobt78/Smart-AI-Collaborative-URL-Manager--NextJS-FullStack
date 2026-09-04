import { NextRequest, NextResponse } from "next/server";
import { getCollaboratorsWithRoles, type UrlItem } from "@/lib/db";
import { getActivitiesForList } from "@/lib/db/activities";
import { getCommentCountsForUrls } from "@/lib/db/comments";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import {
  resolveCollaboratorRole,
  type CollaboratorRolesJson,
} from "@/lib/collaborator-roles";
import {
  ACTIVITY_FEED_LIMIT,
  clampActivityLimit,
} from "@/lib/activity-feed-limit";

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
    const activityLimit = clampActivityLimit(
      searchParams.get("activityLimit") ?? ACTIVITY_FEED_LIMIT,
    );

    const access = await resolveAuthorizedList(id, "view");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { list, user } = access;

    // Initialize positions for URLs that don't have them (backward compatibility)
    const urls = (list.urls as unknown as UrlItem[]) || [];
    const urlsWithPositions: UrlItem[] = urls.map((url, idx) => {
      if (url.position === undefined) {
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
    list.urls = urlsWithPositions as unknown as typeof list.urls;

    // Read normalization must never persist data. Legacy URLs receive stable response
    // positions here; authorized mutations persist positions through their own routes.
    // Determine if user can access collaborators first (synchronous check, no DB query)
    // CRITICAL: Email matching must be case-insensitive; roles may be enriched objects (C7.9)
    const userEmailLower = user?.email.toLowerCase();
    const canViewCollaborators =
      list.isPublic || // Public shared URLs keep their existing read contract.
      (user && list.userId === user.id) || // Owner can always view
      (user &&
        resolveCollaboratorRole(
          list.collaboratorRoles as CollaboratorRolesJson | null,
          user.email,
        ) != null) ||
      (userEmailLower && list.collaborators && Array.isArray(list.collaborators) &&
       list.collaborators.some((email) => email.toLowerCase() === userEmailLower)) || // Legacy check (case-insensitive)
      false;

    // Run all read dependencies in parallel.
    const [activitiesResult, collaboratorsResult, commentCountsResult] = await Promise.allSettled([
      // Activities fetch
      getActivitiesForList(list.id, activityLimit),
      // Collaborators fetch (only if user has access)
      canViewCollaborators 
        ? getCollaboratorsWithRoles(list.id)
        : Promise.resolve([] as Array<{ email: string; role: "editor" | "viewer" }>),
      getCommentCountsForUrls(list.id, urlsWithPositions.map((url) => url.id)),
    ]);

    const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value : [];
    const collaborators: Array<{ email: string; role: "editor" | "viewer" }> = 
      collaboratorsResult.status === "fulfilled" 
        ? collaboratorsResult.value 
        : (() => {
            // If collaborator fetch fails, log but continue without them (non-critical)
            return [];
          })();

    const urlOrder = urlsWithPositions.map((u) => u.id).join(",");
    const clickCounts = urlsWithPositions.map((u) => ({
      urlId: u.id,
      clickCount: u.clickCount || 0,
    }));
    const commentCounts = commentCountsResult.status === "fulfilled" ? commentCountsResult.value : {};

    // Return unified response with list, activities, and collaborators
    // Format matches what getList expects for list, ActivityFeed expects for activities,
    // and PermissionManager expects for collaborators
    return NextResponse.json({
      list,
      activities, // Fixed: was using undefined variable
      collaborators,
      urlOrder,
      clickCounts,
      commentCounts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get updates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
