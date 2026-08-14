"use client";

/**
 * PostHog — init + App Router pageviews (REQ-0006).
 * PostHogPageview uses useSearchParams and must sit in its own Suspense island
 * so Navbar / FloatingBackground are never remounted by searchParams suspend.
 */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, capturePageview } from "@/lib/posthog";

/** Side-effect only — returns null; wrap in <Suspense fallback={null}>. */
export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    capturePageview();
  }, [pathname, searchParams]);

  return null;
}

/**
 * @deprecated Prefer PostHogPageview as a Suspense sibling of chrome.
 * Kept for any external imports that wrap children.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogPageview />
      {children}
    </>
  );
}
