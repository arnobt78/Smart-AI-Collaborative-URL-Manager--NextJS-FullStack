import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Create an activity log entry
 */
export async function createActivity(
  listId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  return prisma.activity.create({
    data: {
      listId,
      userId,
      action,
      details: details ? (details as Prisma.InputJsonValue) : null,
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
 * Get activities for a list
 */
export async function getActivitiesForList(
  listId: string,
  limit: number = 50
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
  limit: number = 20
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

