/** C7.7: Optimistic logout — force-guest + keepalive signout + /login. */
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toaster";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { setWasAuthedHintClient } from "@/lib/was-authed";
import { queueAuthToast } from "@/lib/auth-toast";
import { markForceGuest } from "@/lib/logout-client";

const mockFetch = jest.fn();

jest.mock("@/lib/auth-toast", () => ({
  queueAuthToast: jest.fn(),
}));

jest.mock("@/lib/was-authed", () => ({
  setWasAuthedHintClient: jest.fn(),
}));

jest.mock("@/lib/logout-client", () => ({
  markForceGuest: jest.fn(),
  clearForceGuest: jest.fn(),
  isForceGuest: jest.fn(() => false),
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
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    (setWasAuthedHintClient as jest.Mock).mockClear();
    (queueAuthToast as jest.Mock).mockClear();
    (markForceGuest as jest.Mock).mockClear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("queues toast, force-guest, keepalive signout, clears client (no await)", () => {
    renderDropdown();

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(queueAuthToast).toHaveBeenCalledWith({
      kind: "goodbye",
      name: expect.any(String),
    });
    expect(markForceGuest).toHaveBeenCalled();
    expect(setWasAuthedHintClient).toHaveBeenCalledWith(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });

    // In-flight guard
    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
