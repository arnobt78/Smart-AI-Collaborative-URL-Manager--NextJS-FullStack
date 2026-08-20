"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { prepareWarmSoftNav } from "@/lib/soft-nav-cache";
import { browseQueryKeys } from "@/lib/browse-query-keys";
import { listQueryKeys } from "@/lib/query-keys";

/**
 * C6.8: Shared warm soft-nav helpers for Link click and router.push call sites.
 */

async function intentPrefetch(href: string, queryClient: ReturnType<typeof useQueryClient>) {
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

    if (path === "/browse" && !url.searchParams.get("page") && !url.searchParams.get("search")) {
      await queryClient.prefetchQuery({
        queryKey: browseQueryKeys.publicLists(1, ""),
        queryFn: async () => {
          const response = await fetch("/api/lists/public?page=1&limit=20");
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
            const response = await fetch("/api/business-insights/activity?days=30");
            if (!response.ok) throw new Error("Failed to prefetch activity");
            return response.json();
          },
        }),
      ]);
    }
  } catch {
    // Intent prefetch is best-effort; navigation still proceeds.
  }
}

export function useWarmSoftNav() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return {
    prepare: (href: string) => prepareWarmSoftNav(queryClient, href),
    prefetchIntent: (href: string) => {
      void intentPrefetch(href, queryClient);
    },
    /** Soft-nav with warm/cold skeleton gate for non-Link call sites. */
    warmRouterPush: (href: string) => {
      prepareWarmSoftNav(queryClient, href);
      router.push(href);
    },
  };
}
