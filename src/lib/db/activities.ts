import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ACTIVITY_FEED_LIMIT } from "@/lib/activity-feed-limit";

/**
 * Create an activity log entry, then FIFO-prune older rows beyond ACTIVITY_FEED_LIMIT.
 */
export async function createActivity(
  listId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  const activity = await prisma.activity.create({
    data: {
      listId,
      userId,
      action,
      details: details
        ? (details as Prisma.InputJsonValue)
        : Prisma.JsonNull,
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

  const keep = await prisma.activity.findMany({
    where: { listId },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_FEED_LIMIT,
    select: { id: true },
  });
  const keepIds = keep.map((row) => row.id);
  if (keepIds.length > 0) {
    await prisma.activity.deleteMany({
      where: {
        listId,
        id: { notIn: keepIds },
      },
    });
  }

  return activity;
}

/**
 * Get activities for a list
 */
export async function getActivitiesForList(
  listId: string,
  limit: number = ACTIVITY_FEED_LIMIT
) {
  return prisma.activity.findMany({
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
    take: limit,
  });
}

/**
 * Get recent activities across all lists (for a user)
 */
export async function getRecentActivitiesForUser(
  userId: string,
  limit: number = ACTIVITY_FEED_LIMIT
) {
  return prisma.activity.findMany({
    where: {
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      list: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}
