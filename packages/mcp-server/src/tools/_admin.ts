import { randomBytes } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import {
  pendingInvitations,
  projectMembers,
  projects,
  spaceMembers,
  type ProjectRole,
  type SpaceRole,
  users
} from "@kontex/shared/schema";
import type { Database } from "../db.js";
import { KontexError } from "../errors.js";

export async function guardProjectRoleUpdate(
  db: Database,
  projectId: string,
  targetUserId: string,
  role: "admin" | "member" | "remove"
) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new KontexError("not_found", "Project not found");

  if (targetUserId === project.createdBy && (role === "member" || role === "remove")) {
    throw new KontexError("validation", "Cannot modify the project creator's role");
  }

  const [target] = await db
    .select({ projectRole: projectMembers.projectRole })
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, targetUserId), eq(projectMembers.projectId, projectId)))
    .limit(1);
  if (!target) throw new KontexError("not_found", "Target user is not a member of this project");

  if (target.projectRole === "admin" && (role === "member" || role === "remove")) {
    const [adminCountRow] = await db
      .select({ count: count() })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.projectRole, "admin")));
    if (Number(adminCountRow?.count ?? 0) <= 1) {
      throw new KontexError("validation", "Project must keep at least one admin");
    }
  }
}

export async function applyProjectInvite(
  db: Database,
  invitedBy: string,
  input: {
    projectId: string;
    email: string;
    projectRole: ProjectRole;
    spaceId: string;
    spaceRole: SpaceRole;
  }
): Promise<{ status: "added" | "queued"; message: string }> {
  const [target] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!target) {
    await db.insert(pendingInvitations).values({
      projectId: input.projectId,
      email: input.email,
      projectRole: input.projectRole,
      invitedBy,
      spaceId: input.spaceId,
      spaceRole: input.spaceRole
    });
    return {
      status: "queued",
      message: "Invite saved. User will be added after they sign in."
    };
  }

  await db
    .insert(projectMembers)
    .values({ userId: target.id, projectId: input.projectId, projectRole: input.projectRole })
    .onConflictDoNothing();
  await db
    .insert(spaceMembers)
    .values({
      userId: target.id,
      projectId: input.projectId,
      spaceId: input.spaceId,
      spaceRole: input.spaceRole
    })
    .onConflictDoUpdate({
      target: [spaceMembers.userId, spaceMembers.spaceId],
      set: { spaceRole: input.spaceRole, updatedAt: new Date() }
    });

  return {
    status: "added",
    message: "Member added to the project and selected space."
  };
}

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}
