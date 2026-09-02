import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toaster";
import { UrlList } from "../UrlList";
import { currentList } from "@/stores/urlListStore";
import { verticalOnlyTransform } from "@/lib/dnd-vertical";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

jest.mock("@/hooks/useRealtimeList", () => ({
  useRealtimeList: jest.fn(() => ({ isConnected: false })),
}));

global.EventSource = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 1,
})) as unknown as typeof EventSource;

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

describe("UrlList vertical drag constraints", () => {
  beforeEach(() => {
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

  it("clamps sortable transforms to Y axis only", () => {
    expect(verticalOnlyTransform(null)).toBeNull();
    expect(verticalOnlyTransform(undefined)).toBeNull();
    expect(
      verticalOnlyTransform({ x: 40, y: -12, scaleX: 1, scaleY: 1 }),
    ).toEqual({ x: 0, y: -12, scaleX: 1, scaleY: 1 });
  });

  it("exports dnd-kit vertical axis modifier used by UrlList", () => {
    expect(typeof restrictToVerticalAxis).toBe("function");
  });

  it("wraps sortable URL cards in overflow-x-hidden", () => {
    const { container } = renderWithProviders(<UrlList />);
    expect(screen.getByText("Example 1")).toBeInTheDocument();
    const stack = container.querySelector(".overflow-x-hidden");
    expect(stack).toBeTruthy();
    expect(stack?.textContent).toContain("Example 1");
    expect(stack?.textContent).toContain("Example 2");
  });
});
