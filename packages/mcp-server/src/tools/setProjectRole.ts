import { and, eq } from "drizzle-orm";
import {
  projectMembers,
  setProjectRoleInput,
  spaceMembers,
  type SetProjectRoleInput,
  type SetProjectRoleResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectAdmin, type AuthContext } from "../auth.js";
import { guardProjectRoleUpdate } from "./_admin.js";

export const setProjectRoleTool = {
  name: "set_project_role",
  description: "Set project-level role for a member. Requires project admin role.",
  inputSchema: setProjectRoleInput
};

export async function handleSetProjectRole(
  db: Database,
  ctx: AuthContext,
  input: SetProjectRoleInput
): Promise<SetProjectRoleResult> {
  await requireProjectAdmin(db, ctx.user.id, input.project_id);
  await guardProjectRoleUpdate(db, input.project_id, input.user_id, input.role);

  if (input.role === "remove") {
    await db
      .delete(spaceMembers)
      .where(and(eq(spaceMembers.userId, input.user_id), eq(spaceMembers.projectId, input.project_id)));
    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.userId, input.user_id), eq(projectMembers.projectId, input.project_id)));
  } else {
    await db
      .update(projectMembers)
      .set({ projectRole: input.role })
      .where(and(eq(projectMembers.userId, input.user_id), eq(projectMembers.projectId, input.project_id)));
  }

  return { updated: true, role: input.role };
}
