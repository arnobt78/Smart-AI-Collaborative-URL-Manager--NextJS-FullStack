"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/react-query";
import { SessionListCacheGuard } from "@/components/providers/SessionListCacheGuard";

/**
 * QueryProvider - Wraps the app with React Query
 * CRITICAL: Uses singleton QueryClient to ensure cache persists across Next.js App Router navigations
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // CRITICAL: Use useState to ensure QueryClient is only created once per app lifecycle
  // This prevents cache loss during Next.js App Router navigations
  const [client] = useState(() => queryClient);

  return (
    <QueryClientProvider client={client}>
      <SessionListCacheGuard>{children}</SessionListCacheGuard>
    </QueryClientProvider>
  );
}
