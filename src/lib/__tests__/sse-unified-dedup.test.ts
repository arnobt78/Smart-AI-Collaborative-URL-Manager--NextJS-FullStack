import {
  __resetSseUnifiedDedupForTests,
  beginLocalFlagMutation,
  endLocalFlagMutation,
  hasUnifiedEventDensified,
  markUnifiedEventProcessed,
  scheduleUnifiedInvalidation,
} from "@/lib/sse-unified-dedup";

describe("sse-unified-dedup", () => {
  beforeEach(() => {
    __resetSseUnifiedDedupForTests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    __resetSseUnifiedDedupForTests();
  });

  it("runs scheduled invalidation for collaborators", () => {
    const run = jest.fn();
    expect(scheduleUnifiedInvalidation("activity:1", 300, run, "url_added")).toBe(
      true,
    );
    jest.advanceTimersByTime(300);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("cancels pending invalidation when owner marks densified", () => {
    const run = jest.fn();
    scheduleUnifiedInvalidation("activity:2", 300, run, "url_favorited");
    markUnifiedEventProcessed("activity:2");
    jest.advanceTimersByTime(300);
    expect(run).not.toHaveBeenCalled();
    expect(hasUnifiedEventDensified("activity:2")).toBe(true);
  });

  it("skips schedule during local flag mutation window", () => {
    const run = jest.fn();
    beginLocalFlagMutation(5000);
    expect(
      scheduleUnifiedInvalidation("activity:3", 300, run, "url_favorited"),
    ).toBe(false);
    jest.advanceTimersByTime(300);
    expect(run).not.toHaveBeenCalled();
    endLocalFlagMutation();
  });

  it("dedupes a second schedule for the same eventKey", () => {
    const run = jest.fn();
    expect(scheduleUnifiedInvalidation("activity:4", 300, run)).toBe(true);
    expect(scheduleUnifiedInvalidation("activity:4", 300, run)).toBe(false);
    jest.advanceTimersByTime(300);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
