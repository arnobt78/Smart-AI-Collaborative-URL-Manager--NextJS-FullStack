"use client";

/**
 * PostHog provider (REQ-0006) — initializes once when NEXT_PUBLIC_POSTHOG_KEY is set.
 * Mounted in root layout; no-ops silently without env keys.
 */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, capturePageview } from "@/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  // Capture pageviews on App Router navigations
  useEffect(() => {
    if (!pathname) return;
    capturePageview();
  }, [pathname, searchParams]);

  return <>{children}</>;
}
