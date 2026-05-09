import { and, asc, eq } from "drizzle-orm";
import {
  entries,
  entryVersions,
  getEntryInput,
  type GetEntryInput,
  type GetEntryResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, requireSpaceMember, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";

export const getEntryTool = {
  name: "get_entry",
  description: "Fetch the full content and version history for a single entry the caller can read.",
  inputSchema: getEntryInput
};

export async function handleGetEntry(
  db: Database,
  ctx: AuthContext,
  input: GetEntryInput
): Promise<GetEntryResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);

  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, input.entry_id), eq(entries.projectId, input.project_id)))
    .limit(1);

  if (!entry) {
    throw new KontexError("not_found", "Entry not found in this project");
  }

  await requireSpaceMember(db, ctx.user.id, entry.spaceId, input.project_id);

  const versions = await db
    .select()
    .from(entryVersions)
    .where(eq(entryVersions.entryId, entry.id))
    .orderBy(asc(entryVersions.version));

  return {
    entry_id: entry.id,
    project_id: entry.projectId,
    space_id: entry.spaceId,
    title: entry.title,
    content: entry.content,
    status: entry.status as "active" | "archived",
    created_by: entry.createdBy,
    created_at: entry.createdAt.toISOString(),
    versions: versions.map((v) => ({
      version_id: v.id,
      content: v.content,
      title: v.title,
      changed_by: v.changedBy,
      changed_at: v.changedAt.toISOString(),
      rationale: v.rationale,
      version: v.version
    }))
  };
}
