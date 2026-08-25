/**
 * Collaborator roles JSON helpers.
 * Legacy: { [email]: "editor" | "viewer" }
 * Enriched: { [email]: { role, invitedByEmail?, invitedAt?, updatedAt? } }
 */

export type CollaboratorRole = "editor" | "viewer";

export type CollaboratorRoleEntry = {
  role: CollaboratorRole;
  invitedByEmail?: string | null;
  invitedAt?: string | null;
  updatedAt?: string | null;
};

export type CollaboratorWithMeta = CollaboratorRoleEntry & {
  email: string;
};

export type CollaboratorRolesJson = Record<
  string,
  CollaboratorRole | CollaboratorRoleEntry
>;

function isRole(value: unknown): value is CollaboratorRole {
  return value === "editor" || value === "viewer";
}

/** Normalize a single stored value (string or object) to a role entry. */
export function parseCollaboratorRoleEntry(
  value: unknown,
): CollaboratorRoleEntry | null {
  if (isRole(value)) {
    return { role: value };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (!isRole(record.role)) return null;
    return {
      role: record.role,
      invitedByEmail:
        typeof record.invitedByEmail === "string" ? record.invitedByEmail : null,
      invitedAt: typeof record.invitedAt === "string" ? record.invitedAt : null,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
    };
  }
  return null;
}

/** Resolve role string for permission checks (legacy + enriched). */
export function resolveCollaboratorRole(
  roles: CollaboratorRolesJson | null | undefined,
  email: string,
): CollaboratorRole | null {
  if (!roles || typeof roles !== "object") return null;
  const emailLower = email.toLowerCase();
  const matchingKey = Object.keys(roles).find(
    (key) => key.toLowerCase() === emailLower,
  );
  if (!matchingKey) return null;
  const entry = parseCollaboratorRoleEntry(roles[matchingKey]);
  return entry?.role ?? null;
}

/** Build enriched entry for write paths. */
export function buildCollaboratorRoleEntry(
  role: CollaboratorRole,
  options?: {
    invitedByEmail?: string | null;
    invitedAt?: string | null;
    updatedAt?: string | null;
    previous?: CollaboratorRoleEntry | null;
  },
): CollaboratorRoleEntry {
  const now = new Date().toISOString();
  return {
    role,
    invitedByEmail:
      options?.invitedByEmail ?? options?.previous?.invitedByEmail ?? null,
    invitedAt: options?.invitedAt ?? options?.previous?.invitedAt ?? now,
    updatedAt: options?.updatedAt ?? now,
  };
}

/** Flatten roles JSON into collaborator rows for API/UI. */
export function listCollaboratorsFromRoles(
  roles: CollaboratorRolesJson | null | undefined,
  legacyEmails: string[] = [],
): CollaboratorWithMeta[] {
  const result: CollaboratorWithMeta[] = [];
  const seen = new Set<string>();

  if (roles && typeof roles === "object") {
    for (const [email, value] of Object.entries(roles)) {
      const entry = parseCollaboratorRoleEntry(value);
      if (!entry) continue;
      result.push({ email, ...entry });
      seen.add(email.toLowerCase());
    }
  }

  for (const email of legacyEmails) {
    if (seen.has(email.toLowerCase())) continue;
    result.push({ email, role: "editor" });
    seen.add(email.toLowerCase());
  }

  return result;
}
