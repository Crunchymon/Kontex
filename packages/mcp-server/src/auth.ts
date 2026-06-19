import { and, eq, isNull } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import {
  pendingInvitations,
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

export async function claimPendingInvitationsForEmail(
  db: Database,
  userId: string,
  email: string
) {
  const lowered = email.trim().toLowerCase();
  const invitations = await db
    .select()
    .from(pendingInvitations)
    .where(
      and(
        eq(pendingInvitations.email, lowered),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.revokedAt)
      )
    );

  const now = Date.now();
  for (const invitation of invitations) {
    if (invitation.expiresAt && invitation.expiresAt.getTime() < now) {
      continue;
    }

    await db
      .insert(projectMembers)
      .values({
        userId,
        projectId: invitation.projectId,
        projectRole: invitation.projectRole
      })
      .onConflictDoNothing();

    if (invitation.spaceId && invitation.spaceRole) {
      await db
        .insert(spaceMembers)
        .values({
          userId,
          projectId: invitation.projectId,
          spaceId: invitation.spaceId,
          spaceRole: invitation.spaceRole
        })
        .onConflictDoUpdate({
          target: [spaceMembers.userId, spaceMembers.spaceId],
          set: { spaceRole: invitation.spaceRole, updatedAt: new Date() }
        });
    }

    await db
      .update(pendingInvitations)
      .set({
        acceptedAt: new Date(),
        acceptedBy: userId
      })
      .where(eq(pendingInvitations.id, invitation.id));
  }
}

const CLERK_ISSUER = "https://positive-magpie-18.clerk.accounts.dev";

const JWKS = createRemoteJWKSet(
  new URL(`${CLERK_ISSUER}/.well-known/jwks.json`),
);

function deriveUserName(clerkUser: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
}) {
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (clerkUser.username?.trim()) {
    return clerkUser.username.trim();
  }

  return clerkUser.emailAddresses[0]?.emailAddress ?? null;
}

function derivePrimaryEmail(clerkUser: { emailAddresses: Array<{ emailAddress: string }> }) {
  return clerkUser.emailAddresses[0]?.emailAddress ?? null;
}

export async function authenticate(
  db: Database,
  rawKey: string | undefined,
  clerkSecretKey: string,
): Promise<AuthContext> {
  if (!rawKey) {
    throw new KontexError("missing_auth", "Missing Authorization header");
  }

  const token = rawKey.replace(/^Bearer\s+/i, "").trim();

  let clerkUserId: string;
  let verifiedPayload: Record<string, unknown>;

  try {
    const decoded = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );

    console.log("RAW TOKEN PAYLOAD", decoded);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: CLERK_ISSUER,
    });

    console.log("VERIFIED PAYLOAD", payload);

    verifiedPayload = payload as Record<string, unknown>;
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
    const clerkClient = createClerkClient({ secretKey: clerkSecretKey });
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    const email = derivePrimaryEmail(clerkUser);
    const name = deriveUserName(clerkUser);

    if (!email || !name) {
      throw new KontexError(
        "user_not_found",
        "User not found in database and Clerk did not return enough profile data to create one"
      );
    }

    const [createdUser] = await db
      .insert(users)
      .values({
        clerkId: clerkUserId,
        email,
        name,
      })
      .returning();

    await claimPendingInvitationsForEmail(db, createdUser.id, email);

    return {
      user: createdUser,
    };
  }

  return {
    user: userRow,
  };
}
