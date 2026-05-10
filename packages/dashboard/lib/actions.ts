"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, count, eq, isNull } from "drizzle-orm";
import {
  pendingInvitations,
  projectMembers,
  projects,
  spaceMembers,
  spaces,
  users
} from "@kontex/shared/schema";
import { db } from "./db";
import { auth } from "./auth";
import { createUserApiKey, revokeUserKey } from "./api-keys";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

async function requireProjectAdmin(userId: string, projectId: string) {
  const [m] = await db()
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
    .limit(1);
  if (!m) throw new Error("Not a member of this project");
  if (m.projectRole !== "admin") throw new Error("Project admin role required");
}

export async function createProject(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Project name required");

  const [project] = await db()
    .insert(projects)
    .values({ name, createdBy: userId })
    .returning({ id: projects.id });
  await db().insert(projectMembers).values({
    userId,
    projectId: project.id,
    projectRole: "admin"
  });

  revalidatePath("/projects");
}

export async function createSpace(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) throw new Error("Project and name required");

  await requireProjectAdmin(userId, projectId);

  const [space] = await db()
    .insert(spaces)
    .values({ projectId, name, createdBy: userId })
    .returning({ id: spaces.id });
  await db().insert(spaceMembers).values({
    userId,
    spaceId: space.id,
    projectId,
    spaceRole: "editor"
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/permissions`);
}

export async function inviteMember(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get("project_id") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const projectRole = String(formData.get("role") ?? "member") as "admin" | "member";
  const spaceId = String(formData.get("space_id") ?? "");
  const spaceRole = (String(formData.get("space_role") ?? "editor") as "editor" | "reader") || "editor";
  if (!projectId || !email || !spaceId) throw new Error("Project, email, and space are required");

  await requireProjectAdmin(userId, projectId);

  const [target] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  if (!target) {
    await db().insert(pendingInvitations).values({
      projectId,
      email,
      projectRole,
      invitedBy: userId,
      spaceId,
      spaceRole
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/permissions`);
    return {
      status: "queued" as const,
      message: "Invite saved. They will be added after they sign in to Kontex."
    };
  }

  await db()
    .insert(projectMembers)
    .values({ userId: target.id, projectId, projectRole })
    .onConflictDoNothing();
  await db()
    .insert(spaceMembers)
    .values({ userId: target.id, projectId, spaceId, spaceRole })
    .onConflictDoUpdate({
      target: [spaceMembers.userId, spaceMembers.spaceId],
      set: { spaceRole, updatedAt: new Date() }
    });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/permissions`);
  return {
    status: "added" as const,
    message: "Member added to the project and space."
  };
}

export type CreateInviteLinkResult = {
  id: string;
  inviteUrl: string;
};

export async function createInviteLink(formData: FormData): Promise<CreateInviteLinkResult> {
  const userId = await requireUserId();
  const projectId = String(formData.get("project_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  const spaceRole = (String(formData.get("space_role") ?? "editor") as "editor" | "reader") || "editor";
  const role = (String(formData.get("role") ?? "member") as "admin" | "member") || "member";
  const expiresAtRaw = String(formData.get("expires_at") ?? "");
  if (!projectId || !spaceId) throw new Error("Project and space are required");

  await requireProjectAdmin(userId, projectId);

  const token = randomBytes(24).toString("base64url");
  const [invitation] = await db()
    .insert(pendingInvitations)
    .values({
      projectId,
      token,
      projectRole: role,
      invitedBy: userId,
      spaceId,
      spaceRole,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null
    })
    .returning({ id: pendingInvitations.id });

  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? process.env.MCP_PUBLIC_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl.replace(/\/$/, "")}/invite/${token}`;

  revalidatePath(`/projects/${projectId}`);
  return { id: invitation.id, inviteUrl };
}

export async function revokeInviteLink(formData: FormData) {
  const userId = await requireUserId();
  const inviteId = String(formData.get("invite_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  if (!inviteId || !projectId) throw new Error("Invite and project are required");

  await requireProjectAdmin(userId, projectId);

  await db()
    .update(pendingInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(pendingInvitations.id, inviteId),
        eq(pendingInvitations.projectId, projectId),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.revokedAt)
      )
    );
  revalidatePath(`/projects/${projectId}`);
}

export async function setSpaceRole(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get("project_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  const targetUserId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!projectId || !spaceId || !targetUserId || !role) throw new Error("Missing arguments");

  await requireProjectAdmin(userId, projectId);

  if (role === "none") {
    await db()
      .delete(spaceMembers)
      .where(and(eq(spaceMembers.userId, targetUserId), eq(spaceMembers.spaceId, spaceId)));
  } else if (role === "editor" || role === "reader") {
    await db()
      .insert(spaceMembers)
      .values({ userId: targetUserId, spaceId, projectId, spaceRole: role })
      .onConflictDoUpdate({
        target: [spaceMembers.userId, spaceMembers.spaceId],
        set: { spaceRole: role, updatedAt: new Date() }
      });
  } else {
    throw new Error(`Unknown role: ${role}`);
  }

  revalidatePath(`/projects/${projectId}/permissions`);
}

export async function setProjectRole(formData: FormData) {
  const userId = await requireUserId();
  const projectId = String(formData.get("project_id") ?? "");
  const targetUserId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!projectId || !targetUserId || !role) throw new Error("Missing arguments");

  await requireProjectAdmin(userId, projectId);

  const [project] = await db().select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error("Project not found");

  if (targetUserId === project.createdBy && (role === "remove" || role === "member")) {
    throw new Error("Cannot modify the project creator's role");
  }

  const [targetMembership] = await db()
    .select({ projectRole: projectMembers.projectRole })
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, targetUserId), eq(projectMembers.projectId, projectId)))
    .limit(1);
  if (!targetMembership) throw new Error("Target user is not a member of this project");

  const targetIsAdmin = targetMembership.projectRole === "admin";
  if (targetIsAdmin && (role === "remove" || role === "member")) {
    const [adminCountRow] = await db()
      .select({ count: count() })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.projectRole, "admin")));
    const adminCount = Number(adminCountRow?.count ?? 0);
    if (adminCount <= 1) {
      throw new Error("Project must keep at least one admin");
    }
  }

  if (role === "remove") {
    await db()
      .delete(spaceMembers)
      .where(and(eq(spaceMembers.userId, targetUserId), eq(spaceMembers.projectId, projectId)));
    await db()
      .delete(projectMembers)
      .where(
        and(eq(projectMembers.userId, targetUserId), eq(projectMembers.projectId, projectId))
      );
  } else if (role === "admin" || role === "member") {
    await db()
      .update(projectMembers)
      .set({ projectRole: role })
      .where(
        and(eq(projectMembers.userId, targetUserId), eq(projectMembers.projectId, projectId))
      );
  } else {
    throw new Error(`Unknown role: ${role}`);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/permissions`);
}

export type GeneratedKeyResult = {
  id: string;
  rawKey: string;
};

export async function generateApiKey(formData: FormData): Promise<GeneratedKeyResult> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim() || "Untitled key";
  const created = await createUserApiKey(userId, name);
  revalidatePath("/keys");
  return created;
}

export async function revokeApiKeyAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("API key id required");
  await revokeUserKey(userId, id);
  revalidatePath("/keys");
}
