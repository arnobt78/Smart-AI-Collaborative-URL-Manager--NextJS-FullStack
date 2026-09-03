/** C7.7: Optimistic logout — force-guest + keepalive signout + /login (no pre-nav RQ clear). */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toaster";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { queueAuthToast } from "@/lib/auth-toast";
import { hardNavigateToLogin, markForceGuest } from "@/lib/logout-client";

const mockFetch = jest.fn();

jest.mock("@/lib/auth-toast", () => ({
  queueAuthToast: jest.fn(),
}));

jest.mock("@/lib/logout-client", () => ({
  markForceGuest: jest.fn(),
  clearForceGuest: jest.fn(),
  isForceGuest: jest.fn(() => false),
  hardNavigateToLogin: jest.fn(),
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
    (queueAuthToast as jest.Mock).mockClear();
    (markForceGuest as jest.Mock).mockClear();
    (hardNavigateToLogin as jest.Mock).mockClear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("queues toast, force-guest, keepalive signout, then hardNavigateToLogin", async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(
      screen.getByRole("button", { name: "Open profile menu" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(queueAuthToast).toHaveBeenCalledWith({
      kind: "goodbye",
      name: expect.any(String),
    });
    expect(markForceGuest).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });
    expect(hardNavigateToLogin).toHaveBeenCalledTimes(1);

    // In-flight guard
    await user.click(
      screen.getByRole("button", { name: "Open profile menu" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Logout" }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(hardNavigateToLogin).toHaveBeenCalledTimes(1);
  });
});
