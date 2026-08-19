import {
  archiveUrlFromList,
  currentList,
  removeUrlFromList,
  restoreArchivedUrl,
  patchListSummaryCache,
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
  ],
};

describe("REQ-0023 URL mutation cache safety", () => {
  beforeEach(() => {
    currentList.set(list);
    queryClient.setQueryData(listQueryKeys.allLists(), { lists: [list] });
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
});
