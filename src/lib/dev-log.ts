/**
 * Dev-only console helpers — no-op in production so browser console stays clean.
 * Keep diagnostic strings; call these instead of console.log/warn for noisy SSE/AI paths.
 */
export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(...args);
  }
}
