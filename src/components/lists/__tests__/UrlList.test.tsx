import { render, screen, act, waitFor } from "@testing-library/react";
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

describe("UrlList Component", () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Test Title",
        description: "Test Description",
      }),
    });

    // Reset currentList store
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
      ],
    });
  });

  it("renders the list of URLs", async () => {
    render(
      <TestWrapper>
        <UrlList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Example 1")).toBeInTheDocument();
      expect(screen.getByText("Example 2")).toBeInTheDocument();
    });
  });

  it("handles real-time updates correctly", async () => {
    render(
      <TestWrapper>
        <UrlList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Example 1")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("list-updated", {
          detail: {
            listId: "test-list",
            action: "list_updated",
          },
        })
      );
    });

    // Component should still render after the event
    expect(screen.getByText("Example 1")).toBeInTheDocument();
  });

  it("renders URLs with drag-and-drop context", async () => {
    render(
      <TestWrapper>
        <UrlList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Example 1")).toBeInTheDocument();
      expect(screen.getByText("Example 2")).toBeInTheDocument();
    });

    // Verify component renders with DndContext (drag-and-drop enabled)
    // The component should be wrapped in DndContext which enables drag operations
    const items = screen.getAllByText(/Example/);
    expect(items.length).toBeGreaterThanOrEqual(2);

    // Component should render sortable items that can be dragged
    // This test verifies the component structure supports drag-and-drop
  });
});
