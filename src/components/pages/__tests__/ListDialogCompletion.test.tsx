// REQ-0030: List forms remain confirmed/pending until their own completion point.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NewListPageClient from "@/components/pages/NewListPage";
import EditListPageClient from "@/components/pages/EditListPage";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

jest.mock("@/components/ui/Toaster", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const list = {
  id: "list-1",
  slug: "cached-list",
  title: "Cached List",
  description: "Cached description",
  isPublic: false,
};

function renderWithQueryClient(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe("list dialog completion", () => {
  beforeEach(() => {
    replace.mockReset();
    Object.defineProperty(global, "fetch", { configurable: true, value: jest.fn(), writable: true });
    Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: () => "url-1" });
  });

  it("keeps create pending through the confirmed detail transition", async () => {
    let resolveRequest: (response: Response) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValue(new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    const pending = jest.fn();

    renderWithQueryClient(<NewListPageClient onPendingChange={pending} />);
    fireEvent.change(screen.getByPlaceholderText("e.g., My Favorite Resources"), { target: { value: "Created List" } });
    fireEvent.click(screen.getByRole("button", { name: "Create List" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled());
    resolveRequest({ ok: true, json: async () => ({ list: { ...list, slug: "created-list" } }) } as Response);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/list/created-list", { scroll: false }));
    expect(pending).toHaveBeenLastCalledWith(true);
  });

  it("keeps edit pending until the committed list cache can paint, then closes", async () => {
    let resolveRequest: (response: Response) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValue(new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    const onClose = jest.fn();
    const pending = jest.fn();
    const requestAnimationFrame = jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    renderWithQueryClient(<EditListPageClient list={list} onClose={onClose} onPendingChange={pending} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled());
    resolveRequest({ ok: true, json: async () => ({ list: { ...list, title: "Cached List" } }) } as Response);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(pending).toHaveBeenCalledWith(true);
    requestAnimationFrame.mockRestore();
  });
});
