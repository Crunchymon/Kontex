import { and, asc, eq, inArray } from "drizzle-orm";
import {
  listMembersInput,
  projectMembers,
  spaceMembers,
  users,
  type ListMembersInput,
  type ListMembersResult,
  type SpaceRole
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, type AuthContext } from "../auth.js";

export const listMembersTool = {
  name: "list_members",
  title: "List Members",
  description: "List project members with project role and per-space roles.",
  inputSchema: listMembersInput,
  readOnlyHint: true
};

export async function handleListMembers(
  db: Database,
  ctx: AuthContext,
  input: ListMembersInput
): Promise<ListMembersResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);

  const members = await db
    .select({
      user: users,
      projectRole: projectMembers.projectRole
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, input.project_id))
    .orderBy(asc(users.email));

  if (members.length === 0) {
    return { members: [] };
  }

  const userIds = members.map((m) => m.user.id);
  const spaceRoles = await db
    .select()
    .from(spaceMembers)
    .where(and(eq(spaceMembers.projectId, input.project_id), inArray(spaceMembers.userId, userIds)));

  const byUser = new Map<string, Record<string, SpaceRole>>();
  for (const role of spaceRoles) {
    const existing = byUser.get(role.userId) ?? {};
    existing[role.spaceId] = role.spaceRole;
    byUser.set(role.userId, existing);
  }

  return {
    members: members.map((member) => ({
      user_id: member.user.id,
      email: member.user.email,
      name: member.user.name,
      project_role: member.projectRole,
      space_roles: byUser.get(member.user.id) ?? {}
    }))
  };
}
