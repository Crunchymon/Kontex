import { and, eq, isNull, isNotNull } from "drizzle-orm";
import {
  pendingInvitations,
  projectMembers,
  spaceMembers,
  type ProjectRole,
  type SpaceRole
} from "@kontex/shared/schema";
import { db } from "./db";

type InvitationOutcome = {
  projectId: string;
  spaceId: string | null;
};

async function applyInvitationMembership(
  userId: string,
  invitation: typeof pendingInvitations.$inferSelect
): Promise<InvitationOutcome> {
  await db()
    .insert(projectMembers)
    .values({
      userId,
      projectId: invitation.projectId,
      projectRole: invitation.projectRole as ProjectRole
    })
    .onConflictDoNothing();

  if (invitation.spaceId && invitation.spaceRole) {
    await db()
      .insert(spaceMembers)
      .values({
        userId,
        projectId: invitation.projectId,
        spaceId: invitation.spaceId,
        spaceRole: invitation.spaceRole as SpaceRole
      })
      .onConflictDoUpdate({
        target: [spaceMembers.userId, spaceMembers.spaceId],
        set: {
          spaceRole: invitation.spaceRole as SpaceRole,
          updatedAt: new Date()
        }
      });
  }

  await db()
    .update(pendingInvitations)
    .set({
      acceptedAt: new Date(),
      acceptedBy: userId
    })
    .where(eq(pendingInvitations.id, invitation.id));

  return {
    projectId: invitation.projectId,
    spaceId: invitation.spaceId ?? null
  };
}

export async function claimPendingInvitationsForEmail(
  userId: string,
  email: string
): Promise<InvitationOutcome[]> {
  const lowered = email.trim().toLowerCase();
  const invitations = await db()
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
  const applied: InvitationOutcome[] = [];
  for (const invitation of invitations) {
    if (invitation.expiresAt && invitation.expiresAt.getTime() < now) {
      continue;
    }
    applied.push(await applyInvitationMembership(userId, invitation));
  }
  return applied;
}

export async function acceptTokenInvitation(
  userId: string,
  token: string
): Promise<InvitationOutcome | null> {
  const [invitation] = await db()
    .select()
    .from(pendingInvitations)
    .where(
      and(
        eq(pendingInvitations.token, token),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.revokedAt),
        isNotNull(pendingInvitations.token)
      )
    )
    .limit(1);
  if (!invitation) return null;
  if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
    return null;
  }
  return applyInvitationMembership(userId, invitation);
}
