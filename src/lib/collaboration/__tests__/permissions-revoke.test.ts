import { getRoleForListUser } from "@/lib/collaboration/permissions";
import { buildRevokedCollaboratorEntry } from "@/lib/collaborator-roles";

describe("getRoleForListUser revoke denylist", () => {
  const owner = { id: "owner-1", email: "owner@example.com" };
  const member = { id: "user-2", email: "collab@example.com" };

  it("revoked email is none even when list is public", () => {
    const role = getRoleForListUser(
      {
        userId: owner.id,
        isPublic: true,
        collaboratorRoles: {
          "collab@example.com": buildRevokedCollaboratorEntry(),
        },
      },
      member,
    );
    expect(role).toBe("none");
  });

  it("never-invited signed-in user is viewer on public list", () => {
    const role = getRoleForListUser(
      {
        userId: owner.id,
        isPublic: true,
        collaboratorRoles: {},
      },
      member,
    );
    expect(role).toBe("viewer");
  });

  it("revoked email is none on private list", () => {
    const role = getRoleForListUser(
      {
        userId: owner.id,
        isPublic: false,
        collaboratorRoles: {
          "collab@example.com": buildRevokedCollaboratorEntry(),
        },
      },
      member,
    );
    expect(role).toBe("none");
  });

  it("active editor still has access on public list", () => {
    const role = getRoleForListUser(
      {
        userId: owner.id,
        isPublic: true,
        collaboratorRoles: { "collab@example.com": "editor" },
      },
      member,
    );
    expect(role).toBe("editor");
  });
});
