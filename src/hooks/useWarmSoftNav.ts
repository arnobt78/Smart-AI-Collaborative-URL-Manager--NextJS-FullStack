"use client";

import type { ComponentProps } from "react";
import type Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { prepareWarmSoftNav } from "@/lib/soft-nav-cache";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";
import { ACTIVITY_FEED_LIMIT } from "@/lib/activity-feed-limit";

/**
 * C6.9: Shared warm soft-nav helpers for Link click and router.push/replace sites.
 * Intent prefetch warms RQ so OptimisticSoftNavSurface can paint on soft-nav.
 */

async function intentPrefetch(
  href: string,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  try {
    const url = new URL(href, "http://daily-urlist.local");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/lists") {
      await queryClient.prefetchQuery({
        queryKey: listQueryKeys.allLists(),
        queryFn: async () => {
          const response = await fetch("/api/lists");
          if (!response.ok) throw new Error("Failed to prefetch lists");
          return response.json();
        },
      });
      return;
    }

    if (path === "/browse") {
      const pageRaw = url.searchParams.get("page");
      const page = pageRaw ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;
      const search = url.searchParams.get("search") || "";
      await queryClient.prefetchQuery({
        queryKey: browseQueryKeys.publicLists(page, search),
        queryFn: async () => {
          const params = new URLSearchParams();
          params.set("page", String(page));
          params.set("limit", "20");
          if (search) params.set("search", search);
          const response = await fetch(`/api/lists/public?${params.toString()}`);
          if (!response.ok) throw new Error("Failed to prefetch browse");
          return response.json();
        },
      });
      return;
    }

    if (path === "/business-insights") {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: browseQueryKeys.businessInsights.overview(),
          queryFn: async () => {
            const response = await fetch("/api/business-insights/overview");
            if (!response.ok) throw new Error("Failed to prefetch overview");
            return response.json();
          },
        }),
        queryClient.prefetchQuery({
          queryKey: browseQueryKeys.businessInsights.activity(30),
          queryFn: async () => {
            const response = await fetch(
              "/api/business-insights/activity?days=30",
            );
            if (!response.ok) throw new Error("Failed to prefetch activity");
            return response.json();
          },
        }),
      ]);
      return;
    }

    // C6.9: prefetch unified list so Lists→detail / create→detail can paint warm
    const listMatch = path.match(/^\/list\/([^/]+)$/);
    if (listMatch) {
      const slug = decodeURIComponent(listMatch[1]);
      await queryClient.prefetchQuery({
        queryKey: listQueryKeys.unified(slug),
        queryFn: async () => {
          const response = await fetch(
            `/api/lists/${encodeURIComponent(slug)}/updates?activityLimit=${ACTIVITY_FEED_LIMIT}`,
          );
          if (!response.ok) throw new Error("Failed to prefetch list detail");
          return response.json();
        },
      });
    }
  } catch {
    // Intent prefetch is best-effort; navigation still proceeds.
  }
}

/** Build a string href for warm checks when Link uses a UrlObject. */
export function hrefToWarmNavString(href: ComponentProps<typeof Link>["href"] | string): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname || "/";
  if (typeof href.search === "string" && href.search) {
    return `${pathname}${href.search.startsWith("?") ? href.search : `?${href.search}`}`;
  }
  if (href.query && typeof href.query === "object" && !Array.isArray(href.query)) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(href.query)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, String(item));
      } else {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }
  return pathname;
}

export function useWarmSoftNav() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return {
    prepare: (href: string) => prepareWarmSoftNav(queryClient, href),
    prefetchIntent: (href: string) => {
      void intentPrefetch(href, queryClient);
    },
    /** Soft-nav with warm/cold gate for non-Link push call sites. */
    warmRouterPush: (href: string) => {
      prepareWarmSoftNav(queryClient, href);
      router.push(href);
    },
    /** Soft-nav replace (create→detail) with warm gate when unified is seeded. */
    warmRouterReplace: (href: string, options?: { scroll?: boolean }) => {
      prepareWarmSoftNav(queryClient, href);
      router.replace(href, options);
    },
  };
}
