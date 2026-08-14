/**
 * PostHog analytics (REQ-0006) — env-gated, no-op without NEXT_PUBLIC_POSTHOG_KEY.
 * Does not identify users or send PII until explicitly wired later.
 */

import posthog from "posthog-js";

let initialized = false;

export function initPostHog(): void {
  if (typeof window === "undefined" || initialized) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  if (!key) {
    return;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: false, // provider captures after route mounts
    capture_pageleave: true,
  });

  initialized = true;
}

/** Safe capture — no-ops when PostHog is not configured */
export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !initialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never break the app
  }
}

export function capturePageview(): void {
  if (typeof window === "undefined" || !initialized) return;
  try {
    posthog.capture("$pageview");
  } catch {
    // ignore
  }
}

export function getPostHog() {
  return initialized ? posthog : null;
}
