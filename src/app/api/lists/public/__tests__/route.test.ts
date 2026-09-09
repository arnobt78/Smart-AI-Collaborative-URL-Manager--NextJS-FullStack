/** @jest-environment node */

import { NextRequest } from "next/server";
import { GET } from "../route";
import { getCurrentUser } from "@/lib/auth";
import { getPublicListCards } from "@/lib/db";

jest.mock("@/lib/auth", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/db", () => ({
  getPublicListCards: jest.fn(),
}));

describe("GET /api/lists/public", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects anonymous discovery before database reads", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/lists/public"));

    expect(response.status).toBe(401);
    expect(getPublicListCards).not.toHaveBeenCalled();
  });

  it("returns public discovery cards without urls blobs", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: "user-id", email: "user@example.com" } as never);
    jest.mocked(getPublicListCards).mockResolvedValue({
      lists: [
        {
          id: "list-1",
          slug: "public-one",
          title: "Public One",
          description: null,
          isPublic: true,
          urlCount: 2,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-02"),
          collaborators: [],
          user: { email: "owner@example.com" },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await GET(new NextRequest("http://localhost/api/lists/public"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getPublicListCards).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: "",
    });
    expect(body.lists).toEqual([
      expect.objectContaining({
        id: "list-1",
        slug: "public-one",
        urlCount: 2,
        user: { email: "owner@example.com" },
      }),
    ]);
    expect(body.lists[0].urls).toBeUndefined();
  });
});
