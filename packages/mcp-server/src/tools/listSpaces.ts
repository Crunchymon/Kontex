import { and, asc, eq } from "drizzle-orm";
import {
  listSpacesInput,
  spaceMembers,
  spaces,
  type ListSpacesInput,
  type ListSpacesResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, type AuthContext } from "../auth.js";

export const listSpacesTool = {
  name: "list_spaces",
  description: "List spaces in a project and the caller's role in each space.",
  inputSchema: listSpacesInput
};

export async function handleListSpaces(
  db: Database,
  ctx: AuthContext,
  input: ListSpacesInput
): Promise<ListSpacesResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);

  const rows = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      role: spaceMembers.spaceRole
    })
    .from(spaces)
    .leftJoin(
      spaceMembers,
      and(eq(spaceMembers.spaceId, spaces.id), eq(spaceMembers.userId, ctx.user.id))
    )
    .where(eq(spaces.projectId, input.project_id))
    .orderBy(asc(spaces.name));

  return {
    spaces: rows.map((row) => ({
      space_id: row.id,
      name: row.name,
      space_role: row.role
    }))
  };
}
