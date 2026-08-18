"use client";

import { useEffect, useState } from "react";

/**
 * Prevents short network transitions from flashing placeholders. Cached data
 * stays painted; a placeholder is eligible only for a genuinely cold request.
 */
export function useDelayedPending(
  isPending: boolean,
  hasData: boolean,
  delayMs = 250,
) {
  const [isDelayedPending, setIsDelayedPending] = useState(false);

  useEffect(() => {
    if (!isPending || hasData) {
      setIsDelayedPending(false);
      return;
    }

    const timeout = window.setTimeout(() => setIsDelayedPending(true), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, hasData, isPending]);

  return isDelayedPending;
}
