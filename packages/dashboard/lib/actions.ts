"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import {
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
  const role = String(formData.get("role") ?? "member") as "admin" | "member";
  if (!projectId || !email) throw new Error("Project and email required");

  await requireProjectAdmin(userId, projectId);

  const [target] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  if (!target) {
    throw new Error("User has not signed in to Kontex yet — ask them to sign in once, then re-invite");
  }

  await db()
    .insert(projectMembers)
    .values({ userId: target.id, projectId, projectRole: role })
    .onConflictDoNothing();

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/permissions`);
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
