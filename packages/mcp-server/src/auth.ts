import { and, eq } from "drizzle-orm";
import {
  projectMembers,
  spaceMembers,
  type User,
  users,
} from "@kontex/shared/schema";
import type { Database } from "./db.js";
import { KontexError } from "./errors.js";

import { createRemoteJWKSet, jwtVerify } from "jose";

interface AuthContext {
  user: User;
}

export type { AuthContext };

async function getProjectMemberRole(db: Database, userId: string, projectId: string) {
  const [member] = await db
    .select({ projectRole: projectMembers.projectRole })
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
    .limit(1);

  return member?.projectRole ?? null;
}

async function getSpaceMemberRole(db: Database, userId: string, spaceId: string, projectId: string) {
  const [member] = await db
    .select({ spaceRole: spaceMembers.spaceRole })
    .from(spaceMembers)
    .where(
      and(
        eq(spaceMembers.userId, userId),
        eq(spaceMembers.spaceId, spaceId),
        eq(spaceMembers.projectId, projectId)
      )
    )
    .limit(1);

  return member?.spaceRole ?? null;
}

export async function requireProjectMember(db: Database, userId: string, projectId: string) {
  const projectRole = await getProjectMemberRole(db, userId, projectId);
  if (!projectRole) {
    throw new KontexError("not_project_member", "User is not a member of this project");
  }
}

export async function requireProjectAdmin(db: Database, userId: string, projectId: string) {
  const projectRole = await getProjectMemberRole(db, userId, projectId);
  if (projectRole !== "admin") {
    throw new KontexError("insufficient_role", "User does not have admin access to this project");
  }
}

export async function getSpaceRole(
  db: Database,
  userId: string,
  spaceId: string,
  projectId: string
) {
  return getSpaceMemberRole(db, userId, spaceId, projectId);
}

export async function requireSpaceMember(
  db: Database,
  userId: string,
  spaceId: string,
  projectId: string
) {
  const spaceRole = await getSpaceMemberRole(db, userId, spaceId, projectId);
  if (!spaceRole) {
    throw new KontexError("not_space_member", "User is not a member of this space");
  }
}

export async function requireSpaceEditor(
  db: Database,
  userId: string,
  spaceId: string,
  projectId: string
) {
  const spaceRole = await getSpaceMemberRole(db, userId, spaceId, projectId);
  if (spaceRole !== "editor") {
    throw new KontexError("insufficient_role", "User does not have editor access to this space");
  }
}

export async function listUserSpacesInProject(db: Database, userId: string, projectId: string) {
  const rows = await db
    .select({ spaceId: spaceMembers.spaceId })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.userId, userId), eq(spaceMembers.projectId, projectId)));

  return rows.map((row) => row.spaceId);
}

export async function listUserEditableSpacesInProject(
  db: Database,
  userId: string,
  projectId: string
) {
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

  return rows.map((row) => row.spaceId);
}

const CLERK_ISSUER = "https://positive-magpie-18.clerk.accounts.dev";

const JWKS = createRemoteJWKSet(
  new URL(`${CLERK_ISSUER}/.well-known/jwks.json`),
);

export async function authenticate(
  db: Database,
  rawKey: string | undefined,
  clerkSecretKey: string, // currently unused
): Promise<AuthContext> {
  if (!rawKey) {
    throw new KontexError("missing_auth", "Missing Authorization header");
  }

  const token = rawKey.replace(/^Bearer\s+/i, "").trim();

  let clerkUserId: string;

  try {
    const decoded = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );

    console.log("RAW TOKEN PAYLOAD", decoded);

    const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
      issuer: CLERK_ISSUER,
    });

    console.log("VERIFIED PAYLOAD", payload);

    clerkUserId = String(payload.sub);
  } catch (err) {
    console.error("JWT VERIFY ERROR", {
      name: err?.constructor?.name,
      message: err instanceof Error ? err.message : String(err),
    });

    throw new KontexError("invalid_token", "Invalid or expired token");
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!userRow) {
    console.error("USER NOT FOUND", {
      clerkUserId,
    });

    throw new KontexError("user_not_found", "User not found in database");
  }

  return {
    user: userRow,
  };
}
