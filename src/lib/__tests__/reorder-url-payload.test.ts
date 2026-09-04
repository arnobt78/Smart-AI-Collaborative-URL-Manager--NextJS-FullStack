import { toReorderUrlItems } from "@/lib/reorder-url-payload";

describe("toReorderUrlItems", () => {
  it("strips commentCount and unknown keys", () => {
    const result = toReorderUrlItems([
      {
        id: "u1",
        url: "https://example.com",
        title: "Example",
        commentCount: 3,
        extraField: "nope",
        isFavorite: true,
        position: 0,
      },
    ]);

    expect(result).toEqual([
      {
        id: "u1",
        url: "https://example.com",
        title: "Example",
        isFavorite: true,
        position: 0,
      },
    ]);
    expect(result[0]).not.toHaveProperty("commentCount");
    expect(result[0]).not.toHaveProperty("extraField");
  });

  it("omits null optional fields", () => {
    const result = toReorderUrlItems([
      {
        id: "u2",
        url: "https://example.org",
        description: null,
        title: null,
      },
    ]);

    expect(result[0]).toEqual({
      id: "u2",
      url: "https://example.org",
    });
  });

  it("omits healthLastStatus 0 and invalid datetimes (post health-check)", () => {
    const result = toReorderUrlItems([
      {
        id: "u3",
        url: "https://example.net",
        healthStatus: "broken",
        healthLastStatus: 0,
        healthCheckedAt: "2026-09-04T13:00:00.000Z",
        createdAt: "2026-09-04 13:00:00",
        updatedAt: "2026-09-04T13:00:00.000Z",
      },
    ]);

    expect(result[0]).toEqual({
      id: "u3",
      url: "https://example.net",
      healthStatus: "broken",
      healthCheckedAt: "2026-09-04T13:00:00.000Z",
      updatedAt: "2026-09-04T13:00:00.000Z",
    });
    expect(result[0]).not.toHaveProperty("healthLastStatus");
    expect(result[0]).not.toHaveProperty("createdAt");
  });
});
