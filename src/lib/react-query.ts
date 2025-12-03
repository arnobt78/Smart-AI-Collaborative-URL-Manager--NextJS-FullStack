import { QueryClient } from "@tanstack/react-query";

// Create a query client with caching configuration
// CRITICAL: Default to Infinity cache - individual queries can override if needed
// This ensures consistent caching behavior across the application
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Cache forever until invalidated (default)
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - cache persists for 7 days
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true, // Refetch only when stale (after invalidation)
      retry: 1, // Only retry once on failure
    },
  },
});

// Helper function to save query data to localStorage
export const saveQueryDataToLocalStorage = (
  queryKey: readonly string[],
  data: unknown
) => {
  try {
    const key = `react-query:${queryKey.join(":")}`;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to save query data to localStorage:", error);
    }
  }
};

// Helper function to load query data from localStorage
export const loadQueryDataFromLocalStorage = (queryKey: readonly string[]) => {
  try {
    const key = `react-query:${queryKey.join(":")}`;
    const item = localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      // Check if data is less than 7 days old
      const age = Date.now() - parsed.timestamp;
      if (age < 1000 * 60 * 60 * 24 * 7) {
        return parsed.data;
      }
      // Remove old data
      localStorage.removeItem(key);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to load query data from localStorage:", error);
    }
  }
  return undefined;
};

      console.error("Failed to load query data from localStorage:", error);
    }
  }
  return undefined;
};
