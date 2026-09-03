// REQ-0021: Verify cache-seeded editor state and optimistic list rollback independently of route transitions.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditListPageClient from "@/components/pages/EditListPage";
import {
  listQueryKeys,
  useUpdateList,
  useUpdateListVisibility,
  useDeleteList,
} from "@/hooks/useListQueries";
import { currentList } from "@/stores/urlListStore";

jest.mock("@/components/ui/Toaster", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({
    user: { id: "u1", email: "owner@example.com" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

const list = {
  id: "list-1",
  slug: "cached-list",
  title: "Cached List",
  description: "Cached description",
  isPublic: false,
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function UpdateHarness() {
  const update = useUpdateList();
  return (
    <button
      type="button"
      onClick={() => update.mutate({ ...list, title: "Optimistic title" })}
    >
      Update
    </button>
  );
}

function VisibilityHarness() {
  const update = useUpdateListVisibility();
  return (
    <button
      type="button"
      onClick={() => update.mutate({ id: list.id, slug: list.slug, isPublic: true })}
    >
      Publish
    </button>
  );
}

function DeleteHarness({ deferOptimistic = false }: { deferOptimistic?: boolean }) {
  const remove = useDeleteList();
  return (
    <button
      type="button"
      onClick={() => remove.mutate({ listId: list.id, deferOptimistic })}
    >
      Delete
    </button>
  );
}

describe("REQ-0021 list mutation surfaces", () => {
  beforeEach(() => {
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("initializes the editor from cached list fields without a fetch or loading state", () => {
    const queryClient = makeClient();
    const fetchMock = global.fetch as jest.Mock;

    render(
      <QueryClientProvider client={queryClient}>
        <EditListPageClient list={list} onClose={jest.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("textbox", { name: /title/i })).toHaveValue("Cached List");
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("Cached description");
    expect(screen.getByLabelText("Make this list public")).not.toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rolls back the optimistic list cache when an update fails", async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(listQueryKeys.allLists(), { lists: [list] });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Update failed" }),
    } as Response);

    render(
      <QueryClientProvider client={queryClient}>
        <UpdateHarness />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(queryClient.getQueryData<{ lists: typeof list[] }>(listQueryKeys.allLists())?.lists[0].title).toBe("Cached List");
    });
  });

  it("updates visibility immediately and restores every local surface on failure", async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(listQueryKeys.allLists(), { lists: [list] });
    queryClient.setQueryData(listQueryKeys.unified(list.slug), {
      list,
      activities: [],
      collaborators: [],
      commentCounts: {},
    });
    currentList.set(list);
    let resolveRequest: (response: Response) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <VisibilityHarness />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(queryClient.getQueryData<{ lists: typeof list[] }>(listQueryKeys.allLists())?.lists[0].isPublic).toBe(true);
      expect(currentList.get().isPublic).toBe(true);
    });
    resolveRequest!({
      ok: false,
      json: async () => ({ error: "Visibility failed" }),
    } as Response);
    await waitFor(() => {
      expect(queryClient.getQueryData<{ lists: typeof list[] }>(listQueryKeys.allLists())?.lists[0].isPublic).toBe(false);
      expect(currentList.get().isPublic).toBe(false);
    });
  });

  it("removes a list optimistically and reconciles through the shared impact map", async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(listQueryKeys.allLists(), { lists: [list] });
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    let resolveRequest: (response: Response) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <DeleteHarness />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(queryClient.getQueryData<{ lists: typeof list[] }>(listQueryKeys.allLists())?.lists).toEqual([]);
    });

    resolveRequest({ ok: true, json: async () => ({ success: true }) } as Response);
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });

  it("keeps the list in cache until delete succeeds when deferOptimistic is true", async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(listQueryKeys.allLists(), { lists: [list] });
    let resolveRequest: (response: Response) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <DeleteHarness deferOptimistic />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(
      queryClient.getQueryData<{ lists: typeof list[] }>(listQueryKeys.allLists())?.lists,
    ).toEqual([list]);

    resolveRequest({ ok: true, json: async () => ({ success: true }) } as Response);
    await waitFor(() => {
      expect(
        queryClient.getQueryData<{ lists: typeof list[] }>(listQueryKeys.allLists())?.lists,
      ).toEqual([]);
    });
  });
});
