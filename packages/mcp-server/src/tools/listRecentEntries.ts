import { and, desc, eq } from "drizzle-orm";
import {
  entries,
  listRecentEntriesInput,
  type ListRecentEntriesInput,
  type ListRecentEntriesResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, requireSpaceMember, type AuthContext } from "../auth.js";

export const listRecentEntriesTool = {
  name: "list_recent_entries",
  title: "List Recent Entries",
  description: "List the most recently approved entries in a single space, newest first.",
  inputSchema: listRecentEntriesInput,
  readOnlyHint: true
};

export async function handleListRecentEntries(
  db: Database,
  ctx: AuthContext,
  input: ListRecentEntriesInput
): Promise<ListRecentEntriesResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);
  await requireSpaceMember(db, ctx.user.id, input.space_id, input.project_id);

  const limit = input.limit ?? 20;
  const rows = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.projectId, input.project_id),
        eq(entries.spaceId, input.space_id),
        eq(entries.status, "active")
      )
    )
    .orderBy(desc(entries.createdAt))
    .limit(limit);

  return {
    entries: rows.map((e) => ({
      entry_id: e.id,
      title: e.title,
      content: e.content,
      space_id: e.spaceId,
      created_by: e.createdBy,
      created_at: e.createdAt.toISOString()
    }))
  };
}
