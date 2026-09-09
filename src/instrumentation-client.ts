/**
 * Sentry client init (REQ-0006).
 * Prefer instrumentation-client for Turbopack (`next dev --turbo`).
 * Tunnel is configured via next.config withSentryConfig({ tunnelRoute: "/api/monitoring" })
 * so events go same-origin and bypass typical ad-blockers.
 */

import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_IGNORE_ERRORS,
  sentryBeforeSend,
} from "@/lib/sentry-noise";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV || "development",
  // Low sample rate in production to avoid slowing users / burning quota
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  // No Session Replay / console logging / profiling — keep client light
  ignoreErrors: SENTRY_IGNORE_ERRORS,
  beforeSend(event) {
    return sentryBeforeSend(event);
  },
});

// Instrument App Router navigations when tracing is enabled
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
