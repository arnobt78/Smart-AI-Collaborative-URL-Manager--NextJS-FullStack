/** @jest-environment node */

import { createUrlSchema } from "@/lib/api-validation";
import {
  sanitizeUrlMetadataForApi,
  shouldClearUrlMetadataCache,
} from "@/lib/url-metadata-payload";
import { toReorderUrlItems } from "@/lib/reorder-url-payload";
import { mergeArchivedAtOnWrite } from "@/lib/archive-url-payload";

describe("sanitizeUrlMetadataForApi", () => {
  it("drops null and relative image/favicon", () => {
    expect(
      sanitizeUrlMetadataForApi({
        title: "Stockly",
        description: null,
        image: null,
        favicon: "/favicon.ico",
        siteName: "",
      }),
    ).toEqual({ title: "Stockly" });
  });

  it("keeps absolute http(s) image and favicon", () => {
    expect(
      sanitizeUrlMetadataForApi({
        title: "Ok",
        image: "https://cdn.example.com/a.png",
        favicon: "http://cdn.example.com/f.ico",
      }),
    ).toEqual({
      title: "Ok",
      image: "https://cdn.example.com/a.png",
      favicon: "http://cdn.example.com/f.ico",
    });
  });

  it("returns undefined for empty/invalid input", () => {
    expect(sanitizeUrlMetadataForApi(null)).toBeUndefined();
    expect(sanitizeUrlMetadataForApi({ image: null, favicon: "" })).toBeUndefined();
  });
});

describe("createUrlSchema metadata preprocess", () => {
  it("accepts https URL with null-heavy metadata", () => {
    const parsed = createUrlSchema.safeParse({
      url: "https://stockly-inventory.vercel.app/",
      metadata: {
        title: "Stockly",
        description: null,
        image: null,
        favicon: null,
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.metadata).toEqual({ title: "Stockly" });
    }
  });

  it("accepts sanitized client metadata", () => {
    const meta = sanitizeUrlMetadataForApi({
      title: "X",
      description: null,
      image: "/rel.png",
    });
    const parsed = createUrlSchema.safeParse({
      url: "https://example.com/",
      metadata: meta,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("shouldClearUrlMetadataCache", () => {
  it("keeps cache when a duplicate URL remains", () => {
    expect(
      shouldClearUrlMetadataCache(
        [
          { id: "a", url: "https://example.com/" },
          { id: "b", url: "https://example.com/" },
        ],
        "a",
        "https://example.com/",
      ),
    ).toBe(false);
  });

  it("clears cache when last copy is deleted", () => {
    expect(
      shouldClearUrlMetadataCache(
        [{ id: "a", url: "https://example.com/" }],
        "a",
        "https://example.com/",
      ),
    ).toBe(true);
  });
});

describe("archive payload strip", () => {
  it("strips commentCount and archivedAt for Zod-safe archive body", () => {
    const items = toReorderUrlItems([
      {
        id: "1",
        url: "https://example.com/",
        title: "Ex",
        createdAt: "2026-09-04T00:00:00.000Z",
        isFavorite: false,
        commentCount: 3,
        archivedAt: "2026-09-04T12:00:00.000Z",
      },
    ]);
    expect(items[0]).not.toHaveProperty("commentCount");
    expect(items[0]).not.toHaveProperty("archivedAt");
    expect(items[0].id).toBe("1");
  });
});

describe("mergeArchivedAtOnWrite", () => {
  const nowIso = "2026-09-04T18:00:00.000Z";
  const priorA = "2026-09-01T10:00:00.000Z";

  it("stamps target on archive and preserves sibling archivedAt", () => {
    const merged = mergeArchivedAtOnWrite({
      incoming: [
        { id: "a", url: "https://a.test/" },
        { id: "b", url: "https://b.test/" },
      ],
      existing: [{ id: "a", archivedAt: priorA }],
      action: "archive",
      urlId: "b",
      nowIso,
    });
    expect(merged.find((r) => r.id === "a")?.archivedAt).toBe(priorA);
    expect(merged.find((r) => r.id === "b")?.archivedAt).toBe(nowIso);
  });

  it("stamps the archived urlId even if it had a prior date", () => {
    const merged = mergeArchivedAtOnWrite({
      incoming: [{ id: "a", url: "https://a.test/" }],
      existing: [],
      action: "archive",
      urlId: "a",
      nowIso,
    });
    expect(merged[0].archivedAt).toBe(nowIso);
  });

  it("on restore keeps remaining archived rows' dates", () => {
    const merged = mergeArchivedAtOnWrite({
      incoming: [{ id: "a", url: "https://a.test/" }],
      existing: [
        { id: "a", archivedAt: priorA },
        { id: "b", archivedAt: "2026-09-02T00:00:00.000Z" },
      ],
      action: "restore",
      urlId: "b",
      nowIso,
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].archivedAt).toBe(priorA);
  });
});
