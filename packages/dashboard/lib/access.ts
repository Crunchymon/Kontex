import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  entries,
  pendingInvitations,
  projectMembers,
  projects,
  spaceMembers,
  spaces,
  users,
  proposals,
  branches,
  type ProjectRole,
  type SpaceRole
} from "@kontex/shared/schema";
import { db } from "./db";

export type ProjectSummary = {
  id: string;
  name: string;
  createdAt: string;
  projectRole: ProjectRole;
  spaceCount: number;
};

export async function listProjectsForUser(userId: string): Promise<ProjectSummary[]> {
  const memberships = await db()
    .select({ project: projects, role: projectMembers.projectRole })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId))
    .orderBy(desc(projects.createdAt));

  if (memberships.length === 0) return [];

  const projectIds = memberships.map((m) => m.project.id);
  const allSpaces = await db()
    .select({ projectId: spaces.projectId, id: spaces.id })
    .from(spaces)
    .where(inArray(spaces.projectId, projectIds));

  const counts = new Map<string, number>();
  for (const s of allSpaces) counts.set(s.projectId, (counts.get(s.projectId) ?? 0) + 1);

  return memberships.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    createdAt: m.project.createdAt.toISOString(),
    projectRole: m.role as ProjectRole,
    spaceCount: counts.get(m.project.id) ?? 0
  }));
}

export async function getProjectForUser(userId: string, projectId: string) {
  const [membership] = await db()
    .select({
      project: projects,
      role: projectMembers.projectRole
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
    .limit(1);
  if (!membership) return null;
  return { project: membership.project, projectRole: membership.role as ProjectRole };
}

export async function listSpacesForProject(projectId: string) {
  return db()
    .select()
    .from(spaces)
    .where(eq(spaces.projectId, projectId))
    .orderBy(asc(spaces.name));
}

export type MemberRow = {
  userId: string;
  email: string;
  name: string;
  projectRole: ProjectRole;
  spaceRoles: Record<string, SpaceRole>;
};

export async function listMembersForProject(projectId: string): Promise<MemberRow[]> {
  const members = await db()
    .select({
      user: users,
      projectRole: projectMembers.projectRole
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(asc(users.email));

  if (members.length === 0) return [];

  const userIds = members.map((m) => m.user.id);
  const spaceRoles = await db()
    .select()
    .from(spaceMembers)
    .where(and(eq(spaceMembers.projectId, projectId), inArray(spaceMembers.userId, userIds)));

  const byUser = new Map<string, Record<string, SpaceRole>>();
  for (const sr of spaceRoles) {
    const existing = byUser.get(sr.userId) ?? {};
    existing[sr.spaceId] = sr.spaceRole as SpaceRole;
    byUser.set(sr.userId, existing);
  }

  return members.map((m) => ({
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    projectRole: m.projectRole as ProjectRole,
    spaceRoles: byUser.get(m.user.id) ?? {}
  }));
}

export async function listActiveInviteLinks(projectId: string) {
  return db()
    .select({
      id: pendingInvitations.id,
      token: pendingInvitations.token,
      projectRole: pendingInvitations.projectRole,
      spaceId: pendingInvitations.spaceId,
      spaceRole: pendingInvitations.spaceRole,
      expiresAt: pendingInvitations.expiresAt,
      createdAt: pendingInvitations.createdAt
    })
    .from(pendingInvitations)
    .where(
      and(
        eq(pendingInvitations.projectId, projectId),
        isNotNull(pendingInvitations.token),
        isNull(pendingInvitations.acceptedAt),
        isNull(pendingInvitations.revokedAt)
      )
    )
    .orderBy(desc(pendingInvitations.createdAt));
}

export async function dashboardStats(userId: string) {
  const myProjects = await db()
    .select({ projectId: projectMembers.projectId, projectRole: projectMembers.projectRole })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  if (myProjects.length === 0) {
    return { projects: 0, spaces: 0, members: 0, pending: 0 };
  }

  const projectIds = myProjects.map((p) => p.projectId);

  const [spaceCount, memberCount, pendingCount, mySpaces] = await Promise.all([
    db()
      .select({ id: spaces.id })
      .from(spaces)
      .where(inArray(spaces.projectId, projectIds)),
    db()
      .select({ userId: projectMembers.userId, projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(inArray(projectMembers.projectId, projectIds)),
    db()
      .select({ id: proposals.id })
      .from(proposals)
      .innerJoin(branches, eq(proposals.branchId, branches.id))
      .innerJoin(spaces, eq(branches.spaceId, spaces.id))
      .where(
        and(inArray(spaces.projectId, projectIds), eq(proposals.status, "pending"))
      ),
    db()
      .select({ spaceId: spaceMembers.spaceId })
      .from(spaceMembers)
      .where(and(eq(spaceMembers.userId, userId), inArray(spaceMembers.projectId, projectIds)))
  ]);

  return {
    projects: myProjects.length,
    spaces: spaceCount.length,
    members: new Set(memberCount.map((m) => `${m.projectId}:${m.userId}`)).size,
    pending: pendingCount.length,
    accessibleSpaces: mySpaces.length
  };
}

export async function recentEntriesForUser(userId: string, limit = 6) {
  const accessible = await db()
    .select({ spaceId: spaceMembers.spaceId, projectId: spaceMembers.projectId })
    .from(spaceMembers)
    .where(eq(spaceMembers.userId, userId));
  if (accessible.length === 0) return [];

  const spaceIds = accessible.map((a) => a.spaceId);
  const rows = await db()
    .select({
      id: entries.id,
      title: entries.title,
      content: entries.content,
      spaceId: entries.spaceId,
      createdAt: entries.createdAt
    })
    .from(entries)
    .where(and(inArray(entries.spaceId, spaceIds), eq(entries.status, "active")))
    .orderBy(desc(entries.createdAt))
    .limit(limit);
  return rows;
}
