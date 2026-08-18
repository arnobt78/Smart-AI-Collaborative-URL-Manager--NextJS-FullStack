import { resolveAuthorizedList } from "@/lib/list-route-access";
import { getCurrentUser } from "@/lib/auth";
import { getListBySlugOrId } from "@/lib/db";

jest.mock("@/lib/auth", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/db", () => ({ getListBySlugOrId: jest.fn() }));

const owner = { id: "owner", email: "owner@example.com" };
const editor = { id: "editor", email: "editor@example.com" };
const viewer = { id: "viewer", email: "viewer@example.com" };
const outsider = { id: "outsider", email: "outsider@example.com" };

const list = {
  id: "list-id",
  slug: "list-slug",
  userId: owner.id,
  isPublic: false,
  collaborators: [],
  collaboratorRoles: { [editor.email]: "editor", [viewer.email]: "viewer" },
};

describe("REQ-0022 list route authorization", () => {
  beforeEach(() => {
    jest.mocked(getListBySlugOrId).mockResolvedValue(list as never);
    jest.mocked(getCurrentUser).mockResolvedValue(owner as never);
  });

  afterEach(() => jest.resetAllMocks());

  it("resolves a canonical list once and allows its owner to delete", async () => {
    const result = await resolveAuthorizedList("list-slug", "delete");

    expect(result).toMatchObject({ ok: true, list: { id: list.id }, role: "owner" });
    expect(getListBySlugOrId).toHaveBeenCalledWith("list-slug");
    expect(getListBySlugOrId).toHaveBeenCalledTimes(1);
  });

  it("allows an editor to change content but not visibility or deletion", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(editor as never);

    await expect(resolveAuthorizedList(list.id, "edit")).resolves.toMatchObject({ ok: true, role: "editor" });
    await expect(resolveAuthorizedList(list.id, "visibility")).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(resolveAuthorizedList(list.id, "delete")).resolves.toMatchObject({ ok: false, status: 403 });
  });

  it("allows public viewing without a session but blocks private viewing", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);
    jest.mocked(getListBySlugOrId).mockResolvedValue({ ...list, isPublic: true } as never);

    await expect(resolveAuthorizedList(list.slug, "view")).resolves.toMatchObject({ ok: true, user: null, role: "viewer" });

    jest.mocked(getListBySlugOrId).mockResolvedValue(list as never);
    await expect(resolveAuthorizedList(list.slug, "view")).resolves.toMatchObject({ ok: false, status: 401 });
  });

  it("rejects an unrelated authenticated user before a protected mutation can run", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(outsider as never);

    await expect(resolveAuthorizedList(list.id, "edit")).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(resolveAuthorizedList(list.id, "delete")).resolves.toMatchObject({ ok: false, status: 403 });
  });
});
