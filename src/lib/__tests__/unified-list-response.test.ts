import { normalizeUnifiedListResponse } from "@/lib/unified-list-response";

describe("normalizeUnifiedListResponse", () => {
  it("keeps server-hydrated URL comment badges identical to browser query results", () => {
    const result = normalizeUnifiedListResponse({
      list: {
        id: "list-1",
        slug: "test-list",
        createdAt: "2026-08-19T00:00:00.000Z",
        urls: [{
          id: "url-1",
          url: "https://example.com",
          createdAt: "2026-08-19T00:00:00.000Z",
          isFavorite: false,
        }],
      },
      activities: [],
      collaborators: [{ email: "editor@example.com", role: "editor" }],
      commentCounts: { "url-1": 3 },
    });

    expect(result.list?.urls[0].commentCount).toBe(3);
    expect(result.collaborators).toEqual([{ email: "editor@example.com", role: "editor" }]);
  });
});
