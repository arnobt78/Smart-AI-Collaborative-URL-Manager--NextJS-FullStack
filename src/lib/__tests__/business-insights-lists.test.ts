import {
  buildActivityFromLists,
  buildOverviewFromLists,
  type InsightListRow,
} from "@/lib/business-insights-lists";

describe("C7.2 business insights list builders", () => {
  const base = new Date();
  base.setHours(12, 0, 0, 0);

  const lists: InsightListRow[] = [
    {
      id: "1",
      isPublic: true,
      collaborators: ["a@x.com", "b@x.com"],
      createdAt: base,
      urls: [
        { id: "u1", createdAt: base.toISOString() },
        { id: "u2", createdAt: base.toISOString() },
      ],
    },
    {
      id: "2",
      isPublic: false,
      collaborators: [],
      createdAt: new Date(base.getTime() - 10 * 24 * 60 * 60 * 1000),
      urls: [],
    },
  ];

  it("buildOverviewFromLists counts lists urls visibility collaborators", () => {
    const overview = buildOverviewFromLists(lists);
    expect(overview.totalLists).toBe(2);
    expect(overview.totalUrls).toBe(2);
    expect(overview.publicLists).toBe(1);
    expect(overview.privateLists).toBe(1);
    expect(overview.totalCollaborators).toBe(2);
    expect(overview.recentLists).toBe(1);
    expect(overview.recentUrls).toBe(2);
  });

  it("buildActivityFromLists returns one row per day", () => {
    const activity = buildActivityFromLists(lists, 7);
    expect(activity).toHaveLength(7);
    expect(activity.every((row) => typeof row.date === "string")).toBe(true);
    // Last row is "today" in local calendar (builder uses local midnight keys)
    const todayRow = activity[activity.length - 1];
    expect(todayRow.lists).toBe(1);
    expect(todayRow.urls).toBe(2);
  });
});
