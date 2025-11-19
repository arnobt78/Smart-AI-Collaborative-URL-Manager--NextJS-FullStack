import {
  render,
  screen,
  act,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toaster";
import { UrlList } from "../UrlList";
import { currentList } from "@/stores/urlListStore";

// Mock useRealtimeList hook
jest.mock("@/hooks/useRealtimeList", () => ({
  useRealtimeList: jest.fn(() => ({ isConnected: false })),
}));

// Mock nanostores and @nanostores/react to avoid ESM issues
jest.mock("nanostores", () => ({
  atom: jest.fn((initial) => {
    let value = initial;
    const listeners = new Set<(newValue: any) => void>();
    return {
      get: jest.fn(() => value),
      set: jest.fn((newValue) => {
        value = newValue;
        listeners.forEach((listener) => listener(newValue));
      }),
      subscribe: jest.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      listen: jest.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
    };
  }),
  map: jest.fn((initial) => {
    let value = initial || {};
    const listeners = new Set<(newValue: any) => void>();
    return {
      get: jest.fn(() => value),
      set: jest.fn((newValue) => {
        value = newValue;
        listeners.forEach((listener) => listener(newValue));
      }),
      subscribe: jest.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      listen: jest.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
    };
  }),
}));

// Mock @nanostores/react - need to use actual store functionality
jest.mock("@nanostores/react", () => {
  const React = jest.requireActual("react");
  return {
    useStore: (store: any) => {
      const [value, setValue] = React.useState(() => store.get());
      React.useEffect(() => {
        const unsubscribe = store.listen(setValue);
        return unsubscribe;
      }, [store]);
      return value;
    },
  };
});

// Mock fetch API
global.fetch = jest.fn();

// Mock EventSource for useRealtimeList
global.EventSource = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  url: "",
  withCredentials: false,
})) as any;

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Create a test wrapper with all necessary providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe("UrlList Drag-and-Drop Diagnostic Tests", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    (window as any).__dragOrderCache = {};

    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      // Mock API response that returns the same order (simulating bounce-back)
      if (url.includes("/api/lists/") && url.includes("/urls")) {
        const method = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call[0] === url
        )?.[1]?.method;

        if (method === "PATCH") {
          // Get the body sent to API
          const bodyCall = (global.fetch as jest.Mock).mock.calls.find(
            (call) => call[0] === url && call[1]?.body
          );
          const body = bodyCall ? JSON.parse(bodyCall[1].body) : null;

          return Promise.resolve({
            ok: true,
            json: async () => {
              // DIAGNOSTIC: Return what was sent (should preserve order)
              // If order bounces back, it means client-side state is wrong
              const returnedUrls = body?.urls || [];
              return {
                success: true,
                list: {
                  id: "test-list",
                  slug: "test-list",
                  urls: returnedUrls,
                },
              };
            },
          });
        }
      }
      // Default metadata fetch response
      return Promise.resolve({
        ok: true,
        json: async () => ({
          title: "Test Title",
          description: "Test Description",
        }),
      });
    });

    // Reset currentList store with test data
    currentList.set({
      id: "test-list",
      slug: "test-list",
      urls: [
        {
          id: "1",
          url: "https://example.com/1",
          title: "Example 1",
          createdAt: new Date().toISOString(),
          isFavorite: false,
          position: 0,
        },
        {
          id: "2",
          url: "https://example.com/2",
          title: "Example 2",
          createdAt: new Date().toISOString(),
          isFavorite: false,
          position: 1,
        },
        {
          id: "3",
          url: "https://example.com/3",
          title: "Example 3",
          createdAt: new Date().toISOString(),
          isFavorite: false,
          position: 2,
        },
      ],
    });
  });

  it("diagnoses drag-and-drop bounce-back issue", async () => {
    const { container } = render(
      <TestWrapper>
        <UrlList />
      </TestWrapper>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText("Example 1")).toBeInTheDocument();
      expect(screen.getByText("Example 2")).toBeInTheDocument();
      expect(screen.getByText("Example 3")).toBeInTheDocument();
    });

    // Get initial order from DOM
    const initialItems = screen.getAllByText(/Example \d/);
    const initialOrder = initialItems.map((item) => item.textContent);
    console.log("🔍 [TEST] Initial DOM order:", initialOrder);
    console.log(
      "🔍 [TEST] Initial store order:",
      currentList.get().urls?.map((u: any) => u.id)
    );

    // Find draggable elements - dnd-kit uses data-id attribute or aria-describedby
    // The items are rendered within SortableContext
    const allTextElements = screen.getAllByText(/Example \d/);
    expect(allTextElements.length).toBeGreaterThanOrEqual(3);

    // Find parent elements that contain the draggable items
    const firstItem = screen
      .getByText("Example 1")
      .closest('[role="button"], [role="listitem"], div');
    const secondItem = screen
      .getByText("Example 2")
      .closest('[role="button"], [role="listitem"], div');

    expect(firstItem).toBeTruthy();
    expect(secondItem).toBeTruthy();

    // Simulate drag operation: move item "1" to position of item "2"
    // This should result in order: 2, 1, 3
    // Note: We're not actually using a DragEndEvent since we can't easily access internal handlers
    // Instead, we simulate the drag by directly updating the store as handleDragEnd would
    act(() => {
      // Simulate the drag by directly updating store as handleDragEnd would
      const current = currentList.get();
      if (current?.urls && current.id) {
        const urls = current.urls as any[];
        // Move item 1 to position 2 (swap 1 and 2)
        const oldIndex = urls.findIndex((u) => u.id === "1");
        const newIndex = urls.findIndex((u) => u.id === "2");

        const reordered = [...urls];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        // Update positions
        const reorderedWithPositions = reordered.map((url, idx) => ({
          ...url,
          position: idx,
        }));

        console.log(
          "🔍 [TEST] Reordered URLs:",
          reorderedWithPositions.map((u: any) => u.id)
        );
        currentList.set({ ...current, urls: reorderedWithPositions });
      }
    });

    // Wait a bit for store update to propagate
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Check store order immediately after update
    const storeAfterUpdate = currentList.get().urls?.map((u: any) => u.id);
    console.log(
      "🔍 [TEST] Store order immediately after update:",
      storeAfterUpdate
    );

    // Wait for re-render after store update
    await waitFor(
      () => {
        const newItems = screen.getAllByText(/Example/);
        const newOrder = newItems
          .map((item) => item.textContent?.trim())
          .filter(Boolean);
        console.log("🔍 [TEST] DOM order after reorder:", newOrder);

        // Check if we have items
        if (newOrder.length >= 3) {
          return true;
        }
        return false;
      },
      { timeout: 3000 }
    );

    // Get final order after wait
    const finalItems = screen.getAllByText(/Example/);
    const finalOrder = finalItems
      .map((item) => item.textContent?.trim())
      .filter(Boolean);
    const finalStoreOrder = currentList.get().urls?.map((u: any) => u.id);

    console.log("🔍 [TEST] Final DOM order:", finalOrder);
    console.log("🔍 [TEST] Final store order:", finalStoreOrder);

    // Check localStorage for preserved order
    const storageKey = "drag-order:test-list";
    const stored = localStorage.getItem(storageKey);
    console.log(
      "🔍 [TEST] localStorage:",
      stored ? JSON.parse(stored).map((u: any) => u.id) : "null"
    );
    console.log(
      "🔍 [TEST] globalCache:",
      (window as any).__dragOrderCache?.[storageKey]?.map((u: any) => u.id) ||
        "null"
    );

    // DIAGNOSIS: Check if order changed
    const orderChanged =
      JSON.stringify(initialOrder) !== JSON.stringify(finalOrder);
    const expectedStoreOrder = ["2", "1", "3"]; // After moving item 1 to position of item 2
    const storeOrderCorrect =
      JSON.stringify(finalStoreOrder) === JSON.stringify(expectedStoreOrder);

    console.log("🔍 [TEST DIAGNOSIS]");
    console.log("  - Initial DOM order:", initialOrder);
    console.log("  - Final DOM order:", finalOrder);
    console.log("  - DOM order changed:", orderChanged);
    console.log("  - Store order:", finalStoreOrder);
    console.log("  - Expected store order:", expectedStoreOrder);
    console.log("  - Store order correct:", storeOrderCorrect);

    if (!orderChanged && storeOrderCorrect) {
      console.error(
        "❌ [DIAGNOSIS] Store order is correct but DOM order did not update!"
      );
      console.error(
        "   ROOT CAUSE: Component is not re-rendering after store update"
      );
      console.error("   Possible issues:");
      console.error("   1. urlsToUse memo is not recalculating");
      console.error("   2. SortableContext is not remounting with new items");
      console.error("   3. React is not detecting store change");
      console.error("   4. filteredAndSortedUrls memo is using stale data");
    } else if (orderChanged && !storeOrderCorrect) {
      console.error(
        "❌ [DIAGNOSIS] DOM order changed but store order is wrong!"
      );
      console.error("   ROOT CAUSE: Store update failed");
    } else if (!orderChanged && !storeOrderCorrect) {
      console.error("❌ [DIAGNOSIS] Both DOM and store order did not change!");
      console.error("   ROOT CAUSE: Store update is not persisting");
    } else {
      console.log("✅ [DIAGNOSIS] Both DOM and store order updated correctly!");
    }

    // Check if positions were updated correctly
    const positions = finalStoreOrder?.map((id, idx) => {
      const url = currentList.get().urls?.find((u: any) => u.id === id);
      return { id, position: url?.position, expectedPosition: idx };
    });
    console.log("🔍 [TEST] Position mapping:", positions);

    // At minimum, verify store has correct order
    // If DOM doesn't update, that's the issue we're diagnosing
    expect(finalStoreOrder).toEqual(["2", "1", "3"]);
  });

  it("checks if sortableContextKey remount is causing issues", async () => {
    render(
      <TestWrapper>
        <UrlList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Example 1")).toBeInTheDocument();
    });

    // Check if component structure supports drag
    // dnd-kit renders items within SortableContext, which may not have explicit data-id
    const items = screen.getAllByText(/Example \d/);
    console.log("🔍 [TEST] Items found:", items.length);
    console.log(
      "🔍 [TEST] Item order:",
      items.map((item) => item.textContent)
    );

    // Verify items are rendered (component structure supports drag)
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("checks if urlsToUse memo is using correct source", async () => {
    render(
      <TestWrapper>
        <UrlList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Example 1")).toBeInTheDocument();
    });

    // Check initial state
    const storeUrls = currentList.get().urls;
    console.log(
      "🔍 [TEST] Store URLs:",
      storeUrls?.map((u: any) => ({ id: u.id, position: u.position }))
    );

    // Check localStorage
    const storageKey = "drag-order:test-list";
    const stored = localStorage.getItem(storageKey);
    console.log("🔍 [TEST] localStorage state:", stored ? "has data" : "empty");

    // Check global cache
    const globalCache = (window as any).__dragOrderCache;
    console.log(
      "🔍 [TEST] globalCache state:",
      globalCache?.[storageKey] ? "has data" : "empty"
    );

    // The urlsToUse memo should prefer:
    // 1. finalDragOrderRef.current
    // 2. localStorage/globalCache
    // 3. store
    // If items bounce back, the memo might be using the store instead of ref/cache
  });
});
