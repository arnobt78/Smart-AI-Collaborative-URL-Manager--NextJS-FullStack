/** REQ-BASE-001 logout interaction regression coverage. */
import { fireEvent, render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toaster";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";

const mockFetch = jest.fn();

jest.mock("@/lib/auth-toast", () => ({
  queueAuthToast: jest.fn(),
}));

describe("ProfileDropdown logout", () => {
  let queryClient: QueryClient;

  const renderDropdown = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ProfileDropdown email="test@example.com" />
        </ToastProvider>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    queryClient.clear();
  });

  it("closes immediately and sends only one logout request", () => {
    mockFetch.mockReturnValue(new Promise<Response>(() => undefined));
    renderDropdown();

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Logging out…")).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
    });

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("shows a non-blocking status only after a slow logout", () => {
    mockFetch.mockReturnValue(new Promise<Response>(() => undefined));
    renderDropdown();

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Signing out…");
  });

  it("keeps the session UI available and reports a failed logout", async () => {
    mockFetch.mockResolvedValue({ ok: false } as Response);
    renderDropdown();

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(await screen.findByText("Logout Failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeEnabled();
  });
});
