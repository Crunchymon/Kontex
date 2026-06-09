import { and, eq } from "drizzle-orm";
import { verifyToken } from "@clerk/backend";
import {
  oauthTokens,
  projectMembers,
  spaceMembers,
  type ProjectRole,
  type SpaceRole,
  type User,
  users
} from "@kontex/shared/schema";
import type { Database } from "./db.js";
import { KontexError } from "./errors.js";

export type AuthContext = {
  user: User;
};

export async function authenticate(
  db: Database,
  rawKey: string | undefined,
  clerkSecretKey: string
): Promise<AuthContext> {
  if (!rawKey) {
    throw new KontexError("missing_auth", "Missing Authorization header");
  }
  const token = rawKey.replace(/^Bearer\s+/i, "").trim();
  const [tokenRow] = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.token, token))
    .limit(1);

  if (tokenRow) {
    if (tokenRow.expiresAt < new Date()) {
      throw new KontexError("invalid_token", "Token expired");
    }
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRow.userId))
      .limit(1);
    if (!userRow) throw new KontexError("user_not_found", "User not found");
    return { user: userRow };
  }

  let clerkUserId: string;
  try {
    const verified = await verifyToken(token, {
      secretKey: clerkSecretKey
    });
    clerkUserId = verified.sub;
  } catch (err) {
    throw new KontexError("invalid_token", "Invalid or expired token");
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!userRow) {
    throw new KontexError("user_not_found", "User not found in database");
  }

  return { user: userRow };
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
