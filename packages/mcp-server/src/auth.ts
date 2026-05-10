import { createHmac, randomBytes } from "node:crypto";
import { and, eq, isNull, inArray } from "drizzle-orm";
import {
  apiKeys,
  projectMembers,
  spaceMembers,
  type ApiKey,
  type ProjectRole,
  type SpaceRole,
  type User,
  users
} from "@kontex/shared/schema";
import type { Database } from "./db.js";
import { KontexError } from "./errors.js";

const API_KEY_PREFIX = "kx_";

export function hashApiKey(rawKey: string, hmacSecret: string): string {
  return createHmac("sha256", hmacSecret).update(rawKey).digest("hex");
}

export function generateApiKey(prefix: "live" | "session" = "live"): string {
  const random = randomBytes(32).toString("base64url");
  return `${API_KEY_PREFIX}${prefix}_${random}`;
}

export type AuthContext = {
  user: User;
  apiKey: ApiKey;
};

export async function authenticate(
  db: Database,
  rawKey: string | undefined,
  hmacSecret: string
): Promise<AuthContext> {
  if (!rawKey) {
    throw new KontexError("missing_api_key", "Missing Authorization header");
  }
  const trimmed = rawKey.replace(/^Bearer\s+/i, "").trim();
  if (!trimmed.startsWith(API_KEY_PREFIX)) {
    throw new KontexError("invalid_api_key", "API key has unexpected format");
  }
  const keyHash = hashApiKey(trimmed, hmacSecret);
  const [row] = await db
    .select({
      key: apiKeys,
      user: users
    })
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.userId))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) {
    throw new KontexError("invalid_api_key", "API key not recognized");
  }
  if (row.key.revokedAt !== null) {
    throw new KontexError("revoked_api_key", "API key has been revoked");
  }

  void touchApiKeyAsync(db, row.key.id);

  return { user: row.user, apiKey: row.key };
}

async function touchApiKeyAsync(db: Database, apiKeyId: string): Promise<void> {
  try {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKeyId));
  } catch {
    // best-effort; never fail a request because the touch failed
  }
}

export async function requireProjectMember(
  db: Database,
  userId: string,
  projectId: string
): Promise<{ projectRole: ProjectRole }> {
  const [row] = await db
    .select({ projectRole: projectMembers.projectRole })
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
    .limit(1);
  if (!row) {
    throw new KontexError("not_project_member", "User is not a member of this project");
  }
  return { projectRole: row.projectRole as ProjectRole };
}

export async function requireProjectAdmin(
  db: Database,
  userId: string,
  projectId: string
): Promise<{ projectRole: ProjectRole }> {
  const role = await requireProjectMember(db, userId, projectId);
  if (role.projectRole !== "admin") {
    throw new KontexError("insufficient_role", "This action requires project admin role");
  }
  return role;
}

export async function requireSpaceMember(
  db: Database,
  userId: string,
  spaceId: string,
  projectId: string
): Promise<{ spaceRole: SpaceRole }> {
  const [row] = await db
    .select({ spaceRole: spaceMembers.spaceRole, projectId: spaceMembers.projectId })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.userId, userId), eq(spaceMembers.spaceId, spaceId)))
    .limit(1);
  if (!row) {
    throw new KontexError("not_space_member", "User has no role in this space");
  }
  if (row.projectId !== projectId) {
    throw new KontexError("not_space_member", "Space does not belong to the supplied project");
  }
  return { spaceRole: row.spaceRole as SpaceRole };
}

export async function getSpaceRole(
  db: Database,
  userId: string,
  spaceId: string,
  projectId: string
): Promise<SpaceRole | null> {
  const [row] = await db
    .select({ spaceRole: spaceMembers.spaceRole, projectId: spaceMembers.projectId })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.userId, userId), eq(spaceMembers.spaceId, spaceId)))
    .limit(1);
  if (!row || row.projectId !== projectId) {
    return null;
  }
  return row.spaceRole as SpaceRole;
}

export async function requireSpaceEditor(
  db: Database,
  userId: string,
  spaceId: string,
  projectId: string
): Promise<{ spaceRole: SpaceRole }> {
  const role = await requireSpaceMember(db, userId, spaceId, projectId);
  if (role.spaceRole !== "editor") {
    throw new KontexError("insufficient_role", "This action requires space editor role");
  }
  return role;
}

export async function listUserSpacesInProject(
  db: Database,
  userId: string,
  projectId: string
): Promise<string[]> {
  const rows = await db
    .select({ spaceId: spaceMembers.spaceId })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.userId, userId), eq(spaceMembers.projectId, projectId)));
  return rows.map((r) => r.spaceId);
}

export async function listUserEditableSpacesInProject(
  db: Database,
  userId: string,
  projectId: string
): Promise<string[]> {
  const rows = await db
    .select({ spaceId: spaceMembers.spaceId })
    .from(spaceMembers)
    .where(
      and(
        eq(spaceMembers.userId, userId),
        eq(spaceMembers.projectId, projectId),
        eq(spaceMembers.spaceRole, "editor")
      )
    );
  return rows.map((r) => r.spaceId);
}

// kept here so the auth module owns key lifecycle helpers
export async function revokeApiKey(db: Database, apiKeyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, apiKeyId), isNull(apiKeys.revokedAt)));
}

export async function revokeKeysByIds(db: Database, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(inArray(apiKeys.id, ids), isNull(apiKeys.revokedAt)));
}
