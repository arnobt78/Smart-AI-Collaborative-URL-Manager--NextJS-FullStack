/** @jest-environment node */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlugOrId, getCollaboratorsWithRoles, updateList } from "@/lib/db";
import { getActivitiesForList } from "@/lib/db/activities";
import { getCommentCountsForUrls } from "@/lib/db/comments";
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
  requirePermission: jest.fn(),
  getRoleForListUser: jest.fn(),
}));
import { getRoleForListUser } from "@/lib/collaboration/permissions";

const publicList = {
  id: "list-id",
  slug: "public-list",
  userId: "owner-id",
  isPublic: true,
  urls: [{ id: "url-id", url: "https://example.com", position: 0 }],
  collaborators: [],
  collaboratorRoles: {},
};
const viewer = { id: "viewer-id", email: "viewer@example.com" };

describe("authenticated public-list read routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCurrentUser).mockResolvedValue(viewer as never);
    jest.mocked(getListBySlugOrId).mockResolvedValue({ ...publicList } as never);
    jest.mocked(getRoleForListUser).mockReturnValue("viewer");
    jest.mocked(getCollaboratorsWithRoles).mockResolvedValue([]);
    jest.mocked(getActivitiesForList).mockResolvedValue([]);
    jest.mocked(getCommentCountsForUrls).mockResolvedValue({});
  });

  it("returns the unified public-list payload for an authenticated viewer", async () => {
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

  it("normalizes legacy URL positions without persisting from an anonymous read", async () => {
    jest.mocked(getListBySlugOrId).mockResolvedValue({
      ...publicList,
      urls: [{ id: "url-id", url: "https://example.com" }],
    } as never);

    const response = await getUpdates(
      new NextRequest("http://localhost/api/lists/public-list/updates"),
      { params: Promise.resolve({ id: publicList.slug }) },
    );

    await expect(response.json()).resolves.toMatchObject({
      list: { urls: [{ id: "url-id", position: 0 }] },
    });
    expect(updateList).not.toHaveBeenCalled();
  });

  it("returns public collaborators for an authenticated viewer", async () => {
    const response = await getCollaborators(
      new NextRequest("http://localhost/api/lists/public-list/collaborators"),
      { params: Promise.resolve({ id: publicList.slug }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ collaborators: [] });
    expect(getCollaboratorsWithRoles).toHaveBeenCalledWith(publicList.id);
  });

  it("rejects an anonymous unified-list read before lookup or downstream reads", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await getUpdates(
      new NextRequest("http://localhost/api/lists/private-list/updates"),
      { params: Promise.resolve({ id: "private-list" }) },
    );

    expect(response.status).toBe(401);
    expect(getListBySlugOrId).not.toHaveBeenCalled();
    expect(getActivitiesForList).not.toHaveBeenCalled();
    expect(getCollaboratorsWithRoles).not.toHaveBeenCalled();
    expect(getCommentCountsForUrls).not.toHaveBeenCalled();
  });

  it("rejects an anonymous collaborator read before lookup", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await getCollaborators(
      new NextRequest("http://localhost/api/lists/public-list/collaborators"),
      { params: Promise.resolve({ id: publicList.slug }) },
    );

    expect(response.status).toBe(401);
    expect(getListBySlugOrId).not.toHaveBeenCalled();
    expect(getCollaboratorsWithRoles).not.toHaveBeenCalled();
  });
});
