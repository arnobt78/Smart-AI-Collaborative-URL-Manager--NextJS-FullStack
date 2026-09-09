/**
 * Shared Sentry ignore patterns — client / server / edge (Track B Wave 2).
 */

export const SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
  "top.GLOBALS",
  "ResizeObserver loop limit exceeded",
  "Non-Error promise rejection captured",
  "AbortError",
  "The operation was aborted",
  "The user aborted a request",
  "aborted",
  "MaxListenersExceededWarning",
  /MaxListenersExceeded/i,
  /hydration/i,
  /Minified React error #(418|423|425)/,
  /Failed to fetch.*abort/i,
];

export function sentryBeforeSend<T extends { message?: string }>(
  event: T,
): T | null {
  const message = event.message ?? "";
  if (
    /MaxListenersExceeded/i.test(message) ||
    /AbortError/i.test(message) ||
    /The operation was aborted/i.test(message)
  ) {
    return null;
  }
  return event;
}
