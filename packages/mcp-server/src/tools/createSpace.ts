import {
  createSpaceInput,
  spaceMembers,
  spaces,
  type CreateSpaceInput,
  type CreateSpaceResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectAdmin, type AuthContext } from "../auth.js";

export const createSpaceTool = {
  name: "create_space",
  title: "Create Space",
  description: "Create a space in a project. Requires project admin role.",
  inputSchema: createSpaceInput,
  destructiveHint: true
};

export async function handleCreateSpace(
  db: Database,
  ctx: AuthContext,
  input: CreateSpaceInput
): Promise<CreateSpaceResult> {
  await requireProjectAdmin(db, ctx.user.id, input.project_id);

  const [space] = await db
    .insert(spaces)
    .values({ projectId: input.project_id, name: input.name.trim(), createdBy: ctx.user.id })
    .returning({ id: spaces.id, projectId: spaces.projectId, name: spaces.name });

  await db.insert(spaceMembers).values({
    userId: ctx.user.id,
    spaceId: space.id,
    projectId: input.project_id,
    spaceRole: "editor"
  });

  return {
    space_id: space.id,
    project_id: space.projectId,
    name: space.name
  };
}
