import {
  ACTIVITY_FEED_LIMIT,
  clampActivityLimit,
  sliceActivityFeed,
} from "@/lib/activity-feed-limit";

describe("activity-feed-limit", () => {
  it("exports FIFO limit of 20", () => {
    expect(ACTIVITY_FEED_LIMIT).toBe(20);
  });

  it("sliceActivityFeed keeps newest-first head", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(sliceActivityFeed(items)).toEqual(items.slice(0, 20));
    expect(sliceActivityFeed([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("clampActivityLimit defaults and caps at 20", () => {
    expect(clampActivityLimit(undefined)).toBe(20);
    expect(clampActivityLimit("30")).toBe(20);
    expect(clampActivityLimit(0)).toBe(1);
    expect(clampActivityLimit(10)).toBe(10);
    expect(clampActivityLimit("nope")).toBe(20);
  });
});
