/**
 * C7.2: Shared Insights list scan + pure metric builders.
 * overview + activity SSR call both route handlers in parallel; React.cache
 * ensures one Prisma findMany per request (was double cold DB load).
 */

import { cache as reactCache } from "react";
import { prisma } from "@/lib/prisma";
import type { UrlItem } from "@/stores/urlListStore";

/** Match auth requestCache — Jest/node without React.cache falls through. */
function requestCache<T extends (...args: never[]) => unknown>(fn: T): T {
  if (typeof reactCache === "function") {
    return reactCache(fn as Parameters<typeof reactCache>[0]) as T;
  }
  return fn;
}

/** Slim select — only fields overview/activity need. */
export type InsightListRow = {
  id: string;
  urls: unknown;
  isPublic: boolean;
  collaborators: string[];
  createdAt: Date;
};

export type InsightsOverview = {
  totalLists: number;
  totalUrls: number;
  publicLists: number;
  privateLists: number;
  totalCollaborators: number;
  recentLists: number;
  recentUrls: number;
};

export type InsightsActivityPoint = {
  date: string;
  lists: number;
  urls: number;
};

/**
 * Per-request cached list load for Insights KPIs.
 * Parallel overview+activity GETs share one DB round-trip.
 */
export const loadUserInsightLists = requestCache(
  async (userId: string): Promise<InsightListRow[]> => {
    return prisma.list.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        urls: true,
        isPublic: true,
        collaborators: true,
        createdAt: true,
      },
    });
  },
);

export function buildOverviewFromLists(lists: InsightListRow[]): InsightsOverview {
  const totalLists = lists.length;
  const totalUrls = lists.reduce((sum, list) => {
    const urls = (list.urls as unknown as UrlItem[]) || [];
    return sum + urls.length;
  }, 0);

  const publicLists = lists.filter((list) => list.isPublic).length;
  const privateLists = totalLists - publicLists;

  const totalCollaborators = lists.reduce((sum, list) => {
    return sum + (list.collaborators?.length || 0);
  }, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentLists = lists.filter(
    (list) => new Date(list.createdAt) >= sevenDaysAgo,
  ).length;

  const recentUrls = lists.reduce((sum, list) => {
    const urls = (list.urls as unknown as UrlItem[]) || [];
    return (
      sum +
      urls.filter((url) => {
        const urlDate = new Date(url.createdAt);
        return urlDate >= sevenDaysAgo;
      }).length
    );
  }, 0);

  return {
    totalLists,
    totalUrls,
    publicLists,
    privateLists,
    totalCollaborators,
    recentLists,
    recentUrls,
  };
}

export function buildActivityFromLists(
  lists: InsightListRow[],
  days: number,
): InsightsActivityPoint[] {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const activityMap = new Map<string, { lists: number; urls: number }>();

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split("T")[0];
    activityMap.set(dateStr, { lists: 0, urls: 0 });
  }

  lists.forEach((list) => {
    const listDate = new Date(list.createdAt);
    listDate.setHours(0, 0, 0, 0);
    const dateStr = listDate.toISOString().split("T")[0];

    if (listDate >= startDate) {
      const existing = activityMap.get(dateStr) || { lists: 0, urls: 0 };
      activityMap.set(dateStr, {
        lists: existing.lists + 1,
        urls: existing.urls,
      });
    }

    const urls = (list.urls as unknown as UrlItem[]) || [];
    urls.forEach((url) => {
      if (url.createdAt) {
        const urlDate = new Date(url.createdAt);
        urlDate.setHours(0, 0, 0, 0);
        const urlDateStr = urlDate.toISOString().split("T")[0];

        if (urlDate >= startDate) {
          const existing = activityMap.get(urlDateStr) || {
            lists: 0,
            urls: 0,
          };
          activityMap.set(urlDateStr, {
            lists: existing.lists,
            urls: existing.urls + 1,
          });
        }
      }
    });
  });

  const activityData: InsightsActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split("T")[0];
    const data = activityMap.get(dateStr) || { lists: 0, urls: 0 };
    activityData.push({
      date: dateStr,
      ...data,
    });
  }

  return activityData;
}
