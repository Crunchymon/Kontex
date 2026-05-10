import {
  createProjectInput,
  projectMembers,
  projects,
  type CreateProjectInput,
  type CreateProjectResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { AuthContext } from "../auth.js";

export const createProjectTool = {
  name: "create_project",
  description: "Create a new project and assign caller as project admin.",
  inputSchema: createProjectInput
};

export async function handleCreateProject(
  db: Database,
  ctx: AuthContext,
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  const [project] = await db
    .insert(projects)
    .values({ name: input.name.trim(), createdBy: ctx.user.id })
    .returning({ id: projects.id, name: projects.name });
  await db.insert(projectMembers).values({
    userId: ctx.user.id,
    projectId: project.id,
    projectRole: "admin"
  });

  return { project_id: project.id, name: project.name };
}
