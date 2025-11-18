import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Get all comments for a URL in a list
 */
export async function getCommentsForUrl(listId: string, urlId: string) {
  return prisma.comment.findMany({
    where: {
      listId,
      urlId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

/**
 * Get all comments for a list
 */
export async function getCommentsForList(listId: string) {
  return prisma.comment.findMany({
    where: {
      listId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Get a comment by ID
 */
export async function getCommentById(commentId: string) {
  return prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Create a new comment
 */
export async function createComment(
  listId: string,
  urlId: string,
  content: string,
  userId: string
) {
  return prisma.comment.create({
    data: {
      listId,
      urlId,
      userId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string,
  userId: string
) {
  // Verify ownership
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.userId !== userId) {
    throw new Error("Unauthorized: You can only edit your own comments");
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, userId: string) {
  // Verify ownership or admin access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      list: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // User can delete their own comment or if they own the list
  if (comment.userId !== userId && comment.list.userId !== userId) {
    throw new Error("Unauthorized: You can only delete your own comments");
  }

  return prisma.comment.delete({
    where: { id: commentId },
  });
}

