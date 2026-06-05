import { and, eq } from "drizzle-orm";
import {
  setSpaceRoleInput,
  spaceMembers,
  type SetSpaceRoleInput,
  type SetSpaceRoleResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectAdmin, type AuthContext } from "../auth.js";

export const setSpaceRoleTool = {
  name: "set_space_role",
  title: "Set Space Role",
  description: "Set a member's role in a space. Requires project admin role.",
  inputSchema: setSpaceRoleInput,
  destructiveHint: true
};

export async function handleSetSpaceRole(
  db: Database,
  ctx: AuthContext,
  input: SetSpaceRoleInput
): Promise<SetSpaceRoleResult> {
  await requireProjectAdmin(db, ctx.user.id, input.project_id);

  if (input.role === "none") {
    await db
      .delete(spaceMembers)
      .where(and(eq(spaceMembers.userId, input.user_id), eq(spaceMembers.spaceId, input.space_id)));
  } else {
    await db
      .insert(spaceMembers)
      .values({
        userId: input.user_id,
        spaceId: input.space_id,
        projectId: input.project_id,
        spaceRole: input.role
      })
      .onConflictDoUpdate({
        target: [spaceMembers.userId, spaceMembers.spaceId],
        set: { spaceRole: input.role, updatedAt: new Date() }
      });
  }

  return { updated: true, role: input.role };
}
