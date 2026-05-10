import { desc, eq } from "drizzle-orm";
import {
  listProjectsInput,
  projectMembers,
  projects,
  type ListProjectsInput,
  type ListProjectsResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { AuthContext } from "../auth.js";

export const listProjectsTool = {
  name: "list_projects",
  description: "List projects the caller belongs to, including their project role.",
  inputSchema: listProjectsInput
};

export async function handleListProjects(
  db: Database,
  ctx: AuthContext,
  _input: ListProjectsInput
): Promise<ListProjectsResult> {
  const memberships = await db
    .select({ project: projects, role: projectMembers.projectRole })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, ctx.user.id))
    .orderBy(desc(projects.createdAt));

  return {
    projects: memberships.map((m) => ({
      project_id: m.project.id,
      name: m.project.name,
      project_role: m.role,
      created_at: m.project.createdAt.toISOString()
    }))
  };
}
