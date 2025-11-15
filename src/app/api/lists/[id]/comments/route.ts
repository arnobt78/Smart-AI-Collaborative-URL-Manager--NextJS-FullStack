import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListById } from "@/lib/db";
import {
  getCommentsForUrl,
  createComment,
  updateComment,
  deleteComment,
} from "@/lib/db/comments";
import { publishMessage, CHANNELS } from "@/lib/realtime/redis";
import { createActivity } from "@/lib/db/activities";
import { requirePermission } from "@/lib/collaboration/permissions";

/**
 * GET /api/lists/[id]/comments
 * Get comments for a URL or all comments in a list
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
    const hasAccess =
      list.isPublic ||
      (user &&
        (list.userId === user.id ||
          (list.collaborators && list.collaborators.includes(user.email))));

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized access to this list" },
        { status: 403 }
      );
    }

    // Get comments
    const comments = urlId
      ? await getCommentsForUrl(listId, urlId)
      : await getCommentsForList(listId);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("❌ [COMMENTS] Failed to get comments:", error);
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
    const { id: listId } = await params;
    const { urlId, content } = await request.json();

    if (!urlId || !content?.trim()) {
      return NextResponse.json(
        { error: "URL ID and content are required" },
        { status: 400 }
      );
    }

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

    // Log activity
    const url = (list.urls as unknown as Array<{ id: string; title?: string; url: string }>).find((u) => u.id === urlId);
    await createActivity(listId, user.id, "comment_added", {
      commentId: comment.id,
      urlId,
      url: url?.url || urlId,
      urlTitle: url?.title || url?.url || urlId,
    });

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
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("❌ [COMMENTS] Failed to create comment:", error);
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
    const { id: listId } = await params;
    const { commentId, content } = await request.json();

    if (!commentId || !content?.trim()) {
      return NextResponse.json(
        { error: "Comment ID and content are required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Update comment
    const comment = await updateComment(commentId, content.trim(), user.id);

    // Publish real-time update
    await publishMessage(CHANNELS.listComment(listId), {
      type: "comment_updated",
      listId,
      commentId: comment.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("❌ [COMMENTS] Failed to update comment:", error);
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
    const { id: listId } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Delete comment
    await deleteComment(commentId, user.id);

    // Publish real-time update
    await publishMessage(CHANNELS.listComment(listId), {
      type: "comment_deleted",
      listId,
      commentId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [COMMENTS] Failed to delete comment:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete comment";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

