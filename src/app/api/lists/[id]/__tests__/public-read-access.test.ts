/** @jest-environment node */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlug, getListBySlugOrId, getCollaboratorsWithRoles } from "@/lib/db";
import { getActivitiesForList } from "@/lib/db/activities";
import { getCommentCountsForUrls } from "@/lib/db/comments";
import { hasListAccess } from "@/lib/collaboration/permissions";
import { GET as getUpdates } from "../updates/route";
import { GET as getCollaborators } from "../collaborators/route";

jest.mock("@/lib/auth", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/db", () => ({
  getListBySlug: jest.fn(),
  getListBySlugOrId: jest.fn(),
  getCollaboratorsWithRoles: jest.fn(),
  updateList: jest.fn(),
}));
jest.mock("@/lib/db/activities", () => ({ getActivitiesForList: jest.fn() }));
jest.mock("@/lib/db/comments", () => ({ getCommentCountsForUrls: jest.fn() }));
jest.mock("@/lib/collaboration/permissions", () => ({
  hasListAccess: jest.fn(),
  requirePermission: jest.fn(),
}));

const publicList = {
  id: "list-id",
  slug: "public-list",
  userId: "owner-id",
  isPublic: true,
  urls: [{ id: "url-id", url: "https://example.com", position: 0 }],
  collaborators: [],
  collaboratorRoles: {},
};

describe("public list read routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCurrentUser).mockResolvedValue(null);
    jest.mocked(hasListAccess).mockResolvedValue(true);
    jest.mocked(getListBySlug).mockResolvedValue({ ...publicList } as never);
    jest.mocked(getListBySlugOrId).mockResolvedValue({ ...publicList } as never);
    jest.mocked(getCollaboratorsWithRoles).mockResolvedValue([]);
    jest.mocked(getActivitiesForList).mockResolvedValue([]);
    jest.mocked(getCommentCountsForUrls).mockResolvedValue({});
  });

  it("returns the unified public-list payload without a session", async () => {
    const response = await getUpdates(
      new NextRequest("http://localhost/api/lists/public-list/updates"),
      { params: Promise.resolve({ id: publicList.slug }) },
    );

    await expect(response.json()).resolves.toMatchObject({
      list: { slug: publicList.slug },
      collaborators: [],
    });
    expect(response.status).toBe(200);
    expect(getActivitiesForList).toHaveBeenCalledWith(publicList.id, 30);
  });

  it("returns public collaborators without a session", async () => {
    const response = await getCollaborators(
      new NextRequest("http://localhost/api/lists/public-list/collaborators"),
      { params: Promise.resolve({ id: publicList.slug }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ collaborators: [] });
    expect(getCollaboratorsWithRoles).toHaveBeenCalledWith(publicList.id);
  });

  it("rejects a private unified-list read before data side effects", async () => {
    jest.mocked(hasListAccess).mockResolvedValue(false);

    const response = await getUpdates(
      new NextRequest("http://localhost/api/lists/private-list/updates"),
      { params: Promise.resolve({ id: "private-list" }) },
    );

    expect(response.status).toBe(401);
    expect(getActivitiesForList).not.toHaveBeenCalled();
    expect(getCollaboratorsWithRoles).not.toHaveBeenCalled();
    expect(getCommentCountsForUrls).not.toHaveBeenCalled();
  });
});
