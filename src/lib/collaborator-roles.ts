/**
 * Collaborator roles JSON helpers.
 * Legacy: { [email]: "editor" | "viewer" }
 * Enriched: { [email]: { role, invitedByEmail?, invitedAt?, updatedAt? } }
 * Revoked: { [email]: { role: "revoked", updatedAt? } } — blocks until re-invite
 */

export type CollaboratorRole = "editor" | "viewer";

/** Active roles plus revoke denylist marker (C7.33). */
export type StoredCollaboratorRole = CollaboratorRole | "revoked";

export type CollaboratorRoleEntry = {
  role: CollaboratorRole;
  invitedByEmail?: string | null;
  invitedAt?: string | null;
  updatedAt?: string | null;
};

export type StoredCollaboratorEntry = {
  role: StoredCollaboratorRole;
  invitedByEmail?: string | null;
  invitedAt?: string | null;
  updatedAt?: string | null;
};

export type CollaboratorWithMeta = CollaboratorRoleEntry & {
  email: string;
};

export type CollaboratorRolesJson = Record<
  string,
  CollaboratorRole | StoredCollaboratorEntry
>;

function isActiveRole(value: unknown): value is CollaboratorRole {
  return value === "editor" || value === "viewer";
}

function isStoredRole(value: unknown): value is StoredCollaboratorRole {
  return isActiveRole(value) || value === "revoked";
}

/** Normalize a single stored value (string or object), including revoked. */
export function parseStoredCollaboratorEntry(
  value: unknown,
): StoredCollaboratorEntry | null {
  if (isStoredRole(value)) {
    return { role: value };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (!isStoredRole(record.role)) return null;
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

/** Normalize active collaborator only (revoked → null). */
export function parseCollaboratorRoleEntry(
  value: unknown,
): CollaboratorRoleEntry | null {
  const stored = parseStoredCollaboratorEntry(value);
  if (!stored || stored.role === "revoked") return null;
  return {
    role: stored.role,
    invitedByEmail: stored.invitedByEmail,
    invitedAt: stored.invitedAt,
    updatedAt: stored.updatedAt,
  };
}

function findRoleKey(
  roles: CollaboratorRolesJson,
  email: string,
): string | undefined {
  const emailLower = email.toLowerCase();
  return Object.keys(roles).find((key) => key.toLowerCase() === emailLower);
}

/** True when this email was removed and not yet re-invited. */
export function isRevokedCollaborator(
  roles: CollaboratorRolesJson | null | undefined,
  email: string,
): boolean {
  if (!roles || typeof roles !== "object" || !email) return false;
  const key = findRoleKey(roles, email);
  if (!key) return false;
  return parseStoredCollaboratorEntry(roles[key])?.role === "revoked";
}

/** Resolve active role for permission checks (legacy + enriched; never revoked). */
export function resolveCollaboratorRole(
  roles: CollaboratorRolesJson | null | undefined,
  email: string,
): CollaboratorRole | null {
  if (!roles || typeof roles !== "object") return null;
  const matchingKey = findRoleKey(roles, email);
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
    previous?: CollaboratorRoleEntry | StoredCollaboratorEntry | null;
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

/** Mark removed collaborator (denylist until re-invite). */
export function buildRevokedCollaboratorEntry(
  options?: {
    previous?: CollaboratorRoleEntry | StoredCollaboratorEntry | null;
  },
): StoredCollaboratorEntry {
  const now = new Date().toISOString();
  return {
    role: "revoked",
    invitedByEmail: options?.previous?.invitedByEmail ?? null,
    invitedAt: options?.previous?.invitedAt ?? null,
    updatedAt: now,
  };
}

/** Flatten roles JSON into collaborator rows for API/UI (skips revoked). */
export function listCollaboratorsFromRoles(
  roles: CollaboratorRolesJson | null | undefined,
  legacyEmails: string[] = [],
): CollaboratorWithMeta[] {
  const result: CollaboratorWithMeta[] = [];
  const seen = new Set<string>();

  if (roles && typeof roles === "object") {
    for (const [email, value] of Object.entries(roles)) {
      const stored = parseStoredCollaboratorEntry(value);
      if (!stored || stored.role === "revoked") {
        if (stored?.role === "revoked") {
          seen.add(email.toLowerCase());
        }
        continue;
      }
      result.push({
        email,
        role: stored.role,
        invitedByEmail: stored.invitedByEmail,
        invitedAt: stored.invitedAt,
        updatedAt: stored.updatedAt,
      });
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
