import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById } from "@/lib/db";
import { hasListAccess } from "@/lib/collaboration/permissions";
import {
  getCommentsForUrl,
  getCommentsForList,
  createComment,
  updateComment,
  deleteComment,
} from "@/lib/db/comments";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { createActivity } from "@/lib/db/activities";
import { requirePermission } from "@/lib/collaboration/permissions";
import {
  commentCreateSchema,
  commentDeleteSchema,
  commentPatchSchema,
  parseJsonBody,
  parseRouteParams,
} from "@/lib/api-validation";
import { redis, cacheKeys } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/lists/[id]/comments
 * Get comments for a URL or all comments in a list (cached in Redis)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const { searchParams } = new URL(request.url);
    const urlId = searchParams.get("urlId");

    // Verify list exists and user has access
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const hasAccess = await hasListAccess(list, user);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized access to this list" },
        { status: 403 }
      );
    }

    // Check Redis cache for comments
    const cacheKey = cacheKeys.comments(listId, urlId || undefined);
    let cachedComments = null;

    if (redis) {
      try {
        cachedComments = await redis.get<unknown[]>(cacheKey);
        if (cachedComments) {
          return NextResponse.json({
            comments: cachedComments,
            cached: true,
          });
        }
      } catch {
        // Ignore cache read errors
      }
    }

    // Get comments from database
    const comments = urlId
      ? await getCommentsForUrl(listId, urlId)
      : await getCommentsForList(listId);

    // Cache comments in Redis (30 minutes TTL)
    if (redis) {
      try {
        await redis.set(cacheKey, comments, { ex: 1800 }); // 30 minutes
      } catch {
        // Ignore cache write errors
      }
    }

    return NextResponse.json({
      comments,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/lists/[id]/comments
 * Create a new comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsed = await parseJsonBody(request, commentCreateSchema);
    if (!parsed.success) return parsed.response;
    const { id: listId } = await params;
    const { urlId, content } = parsed.data;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify list exists and user has access
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check comment permission
    try {
      await requirePermission(listId, user.id, "comment");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Permission denied";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // Create comment
    const comment = await createComment(listId, urlId, content.trim(), user.id);

    // Get URL info for activity
    const url = (list.urls as unknown as Array<{ id: string; title?: string; url: string }>).find((u) => u.id === urlId);

    // Log activity and get activity data
    const activity = await createActivity(listId, user.id, "comment_added", {
      commentId: comment.id,
      urlId,
      url: url?.url || urlId,
      urlTitle: url?.title || url?.url || urlId,
    });

    // Invalidate comments cache for this list and URL
    if (redis) {
      try {
        // Invalidate cache for this specific URL
        await redis.del(cacheKeys.comments(listId, urlId));
        // Also invalidate cache for all comments in the list
        await redis.del(cacheKeys.comments(listId));
      } catch {
        // Ignore cache invalidation errors
      }
    }

    // Publish real-time update
    await publishMessage(CHANNELS.listComment(listId), {
      type: "comment_added",
      listId,
      urlId,
      commentId: comment.id,
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId,
      action: "comment_added",
      timestamp: new Date().toISOString(),
      activity: {
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt.toISOString(),
        user: activity.user ? {
          id: activity.user.id,
          email: activity.user.email,
        } : {
          id: user.id,
          email: user.email,
        },
      },
    });

    return NextResponse.json(
      {
        comment,
        activity: {
          id: activity.id,
          action: activity.action,
          details: activity.details,
          createdAt: activity.createdAt,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/lists/[id]/comments
 * Update a comment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsed = await parseJsonBody(request, commentPatchSchema);
    if (!parsed.success) return parsed.response;
    const { id: listId } = await params;
    const { commentId, content } = parsed.data;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get comment before update to get urlId and listId
    const commentBefore = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { urlId: true, listId: true },
    });
    const urlId = commentBefore?.urlId;

    if (!urlId) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Get list to get URL info for activity
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Update comment
    const comment = await updateComment(commentId, content.trim(), user.id);

    // Get URL info for activity
    const url = (list.urls as unknown as Array<{ id: string; title?: string; url: string }>).find((u) => u.id === urlId);

    // Log activity and get activity data
    const activity = await createActivity(listId, user.id, "comment_updated", {
      commentId: comment.id,
      urlId,
      url: url?.url || urlId,
      urlTitle: url?.title || url?.url || urlId,
    });

    // Invalidate comments cache for this list and URL
    if (redis && urlId) {
      try {
        // Invalidate cache for this specific URL
        await redis.del(cacheKeys.comments(listId, urlId));
        // Also invalidate cache for all comments in the list
        await redis.del(cacheKeys.comments(listId));
      } catch {
        // Ignore cache invalidation errors
      }
    }

    // Publish real-time update
    await publishMessage(CHANNELS.listComment(listId), {
      type: "comment_updated",
      listId,
      commentId: comment.id,
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId,
      action: "comment_updated",
      timestamp: new Date().toISOString(),
      activity: {
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt.toISOString(),
        user: activity.user ? {
          id: activity.user.id,
          email: activity.user.email,
        } : {
          id: user.id,
          email: user.email,
        },
      },
    });

    return NextResponse.json({
      comment,
      activity: {
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update comment";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/lists/[id]/comments
 * Delete a comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const query = parseRouteParams(
      { commentId: new URL(request.url).searchParams.get("commentId") },
      commentDeleteSchema,
    );
    if (!query.success) return query.response;
    const { commentId } = query.data;
    const { id: listId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get comment before delete to get urlId and listId for activity and cache invalidation
    const commentBefore = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { urlId: true, listId: true },
    });
    const urlId = commentBefore?.urlId;

    if (!urlId) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Get list to get URL info for activity
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Get URL info for activity before deleting
    const url = (list.urls as unknown as Array<{ id: string; title?: string; url: string }>).find((u) => u.id === urlId);

    // Delete comment
    await deleteComment(commentId, user.id);

    // Log activity and get activity data
    const activity = await createActivity(listId, user.id, "comment_deleted", {
      commentId,
      urlId,
      url: url?.url || urlId,
      urlTitle: url?.title || url?.url || urlId,
    });

    // Invalidate comments cache for this list and URL
    if (redis && urlId) {
      try {
        // Invalidate cache for this specific URL
        await redis.del(cacheKeys.comments(listId, urlId));
        // Also invalidate cache for all comments in the list
        await redis.del(cacheKeys.comments(listId));
      } catch {
        // Ignore cache invalidation errors
      }
    }

    // Publish real-time update
    await publishMessage(CHANNELS.listComment(listId), {
      type: "comment_deleted",
      listId,
      commentId,
      timestamp: new Date().toISOString(),
    });

    // Publish activity update
    await publishMessage(CHANNELS.listActivity(listId), {
      type: "activity_created",
      listId,
      action: "comment_deleted",
      timestamp: new Date().toISOString(),
      activity: {
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt.toISOString(),
        user: activity.user ? {
          id: activity.user.id,
          email: activity.user.email,
        } : {
          id: user.id,
          email: user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      activity: {
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete comment";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
