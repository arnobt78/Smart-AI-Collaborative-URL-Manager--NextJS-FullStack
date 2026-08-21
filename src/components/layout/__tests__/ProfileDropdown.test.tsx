/** Logout: clear client + await signout before `/` (Auth) — no Marketing flash. */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toaster";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { setWasAuthedHintClient } from "@/lib/was-authed";
import { queueAuthToast } from "@/lib/auth-toast";

const mockFetch = jest.fn();

jest.mock("@/lib/auth-toast", () => ({
  queueAuthToast: jest.fn(),
}));

jest.mock("@/lib/was-authed", () => ({
  setWasAuthedHintClient: jest.fn(),
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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("awaits signout with credentials then guards double-click", async () => {
    let resolveSignout!: (value: { ok: boolean }) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveSignout = resolve;
        }),
    );

    renderDropdown();

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(queueAuthToast).toHaveBeenCalled();
    expect(setWasAuthedHintClient).toHaveBeenCalledWith(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
    });

    await act(async () => {
      resolveSignout({ ok: true });
    });

    // In-flight guard: second logout click does not double-fetch
    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
