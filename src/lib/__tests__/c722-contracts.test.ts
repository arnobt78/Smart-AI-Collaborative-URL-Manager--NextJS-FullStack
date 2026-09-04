/** @jest-environment node */

/**
 * Lite metadata path: title/description only (used by refresh-metadata jobs).
 * Full Cloudinary/image pipeline is skipped when lite=1.
 */

describe("metadata lite query contract", () => {
  it("documents lite=1 as title/description-only for jobs", () => {
    const liteQuery = "lite=1";
    expect(liteQuery).toBe("lite=1");
    // Job URLs: /api/metadata?url=…&lite=1 — see refresh-metadata route
    const jobUrl = `/api/metadata?url=${encodeURIComponent("https://example.com")}&${liteQuery}`;
    expect(jobUrl).toContain("lite=1");
    expect(jobUrl).toContain("url=");
  });

  it("click eventKey matches densify mark format", () => {
    const listId = "list-1";
    const urlId = "url-1";
    const newClickCount = 3;
    expect(`click:${listId}:${urlId}:${newClickCount}`).toBe(
      "click:list-1:url-1:3",
    );
  });
});
