import {
  buildCollaboratorRoleEntry,
  listCollaboratorsFromRoles,
  parseCollaboratorRoleEntry,
  resolveCollaboratorRole,
} from "@/lib/collaborator-roles";

describe("collaborator-roles", () => {
  it("parses legacy string roles and enriched objects", () => {
    expect(parseCollaboratorRoleEntry("editor")).toEqual({ role: "editor" });
    expect(
      parseCollaboratorRoleEntry({
        role: "viewer",
        invitedByEmail: "a@b.com",
        invitedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ).toMatchObject({
      role: "viewer",
      invitedByEmail: "a@b.com",
    });
  });

  it("resolves role case-insensitively for permissions", () => {
    expect(
      resolveCollaboratorRole(
        { "User@Example.com": "editor" },
        "user@example.com",
      ),
    ).toBe("editor");
    expect(
      resolveCollaboratorRole(
        {
          "user@example.com": {
            role: "viewer",
            invitedByEmail: "owner@example.com",
          },
        },
        "USER@example.com",
      ),
    ).toBe("viewer");
  });

  it("lists collaborators from mixed legacy + enriched JSON", () => {
    const rows = listCollaboratorsFromRoles(
      {
        "a@x.com": "editor",
        "b@x.com": {
          role: "viewer",
          invitedByEmail: "owner@x.com",
          invitedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      },
      ["c@x.com"],
    );
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.email === "b@x.com")?.invitedByEmail).toBe(
      "owner@x.com",
    );
    expect(rows.find((r) => r.email === "c@x.com")?.role).toBe("editor");
  });

  it("buildCollaboratorRoleEntry preserves invite metadata on role change", () => {
    const previous = buildCollaboratorRoleEntry("editor", {
      invitedByEmail: "owner@x.com",
      invitedAt: "2026-01-01T00:00:00.000Z",
    });
    const updated = buildCollaboratorRoleEntry("viewer", { previous });
    expect(updated.role).toBe("viewer");
    expect(updated.invitedByEmail).toBe("owner@x.com");
    expect(updated.invitedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBeTruthy();
  });
});
