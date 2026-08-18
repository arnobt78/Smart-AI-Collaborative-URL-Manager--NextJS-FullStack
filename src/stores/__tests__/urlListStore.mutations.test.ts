import { currentList, removeUrlFromList, type UrlList } from "@/stores/urlListStore";

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
});
