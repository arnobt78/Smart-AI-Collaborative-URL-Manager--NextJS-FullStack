import { QueryClient, dehydrate } from "@tanstack/react-query";

/** REQ-0027: A request-scoped QueryClient avoids leaking user data between SSR requests. */
export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60 * 24 * 7,
        retry: false,
      },
    },
  });
}

export { dehydrate };
