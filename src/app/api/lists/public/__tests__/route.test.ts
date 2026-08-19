/** @jest-environment node */

import { NextRequest } from "next/server";
import { GET } from "../route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    list: { findMany: jest.fn(), count: jest.fn() },
  },
}));

describe("GET /api/lists/public", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects anonymous discovery before database reads", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/lists/public"));

    expect(response.status).toBe(401);
    expect(prisma.list.findMany).not.toHaveBeenCalled();
    expect(prisma.list.count).not.toHaveBeenCalled();
  });

  it("returns public discovery to an authenticated account", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: "user-id", email: "user@example.com" } as never);
    jest.mocked(prisma.list.findMany).mockResolvedValue([] as never);
    jest.mocked(prisma.list.count).mockResolvedValue(0);

    const response = await GET(new NextRequest("http://localhost/api/lists/public"));

    expect(response.status).toBe(200);
    expect(prisma.list.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublic: true } }));
  });
});
