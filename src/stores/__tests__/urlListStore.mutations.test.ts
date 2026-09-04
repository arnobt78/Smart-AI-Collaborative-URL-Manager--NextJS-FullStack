import {
  archiveUrlFromList,
  currentList,
  removeUrlFromList,
  restoreArchivedUrl,
  patchListSummaryCache,
  reorderUrls,
  updateUrlInList,
  type UrlList,
} from "@/stores/urlListStore";
import { queryClient } from "@/lib/react-query";
import { listQueryKeys } from "@/lib/query-keys";

const list: UrlList = {
  id: "list-1",
  slug: "rollback-list",
  title: "Rollback List",
  description: "Test list",
  createdAt: "2026-08-19T00:00:00.000Z",
  urls: [
    {
      id: "url-1",
      url: "https://example.com",
      title: "Example",
      createdAt: "2026-08-19T00:00:00.000Z",
      isFavorite: false,
    },
    {
      id: "url-2",
      url: "https://example.org",
      title: "Other",
      createdAt: "2026-08-19T00:00:00.000Z",
      isFavorite: false,
    },
  ],
};

describe("REQ-0023 URL mutation cache safety", () => {
  beforeEach(() => {
    currentList.set(list);
    queryClient.setQueryData(listQueryKeys.allLists(), { lists: [list] });
    queryClient.setQueryData(listQueryKeys.unified(list.slug!), {
      list,
      activities: [],
      commentCounts: {},
    });
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    currentList.set({});
    jest.restoreAllMocks();
  });

  it("restores the pre-mutation list snapshot after a failed URL delete", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response);

    await expect(removeUrlFromList("url-1")).rejects.toThrow("Failed to remove URL");

    expect(currentList.get()).toEqual(list);
  });

  it("restores the exact active and archived URL snapshot after archive failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response);

    await expect(archiveUrlFromList("url-1")).rejects.toThrow("Failed to archive URL");

    expect(currentList.get()).toEqual(list);
  });

  it("restores the exact active and archived URL snapshot after restore failure", async () => {
    const archivedList: UrlList = {
      ...list,
      urls: [],
      archivedUrls: [{ ...list.urls[0], archivedAt: "2026-08-19T00:00:00.000Z" } as NonNullable<UrlList["archivedUrls"]>[number]],
    };
    currentList.set(archivedList);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response);

    await restoreArchivedUrl("url-1");

    expect(currentList.get()).toEqual(archivedList);
  });

  it("commits a completed URL mutation timestamp to the list-summary cache", () => {
    const updatedAt = "2026-08-19T12:00:00.000Z";
    patchListSummaryCache({ ...list, updatedAt });

    expect(
      queryClient.getQueryData<{ lists: UrlList[] }>(listQueryKeys.allLists())?.lists[0]?.updatedAt,
    ).toBe(updatedAt);
  });

  it("strips commentCount from reorder PATCH body", async () => {
    currentList.set({
      ...list,
      urls: list.urls.map((u) => ({ ...u, commentCount: 5 })),
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        list: { ...list, urls: [list.urls[1], list.urls[0]] },
        activity: null,
      }),
    });

    await reorderUrls(0, 1);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.urls[0]).not.toHaveProperty("commentCount");
    expect(body.action).toBe("reorder");
  });

  it("flag-only densify updates unified cache before network resolves", async () => {
    let resolveFetch!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const pending = updateUrlInList("url-1", { isFavorite: true });

    // Optimistic densify should already flip the flag in unified RQ
    const mid = queryClient.getQueryData<{
      list: UrlList;
    }>(listQueryKeys.unified(list.slug!));
    expect(mid?.list.urls.find((u) => u.id === "url-1")?.isFavorite).toBe(true);

    resolveFetch({
      ok: true,
      json: async () => ({
        list: {
          ...list,
          urls: list.urls.map((u) =>
            u.id === "url-1" ? { ...u, isFavorite: true } : u,
          ),
        },
        activity: {
          id: "act-1",
          action: "url_favorited",
          details: {},
          createdAt: "2026-08-19T12:00:00.000Z",
          user: { id: "u1", email: "a@b.com" },
        },
      }),
    });

    await pending;
  });
});
