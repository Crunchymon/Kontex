import { and, desc, eq, inArray } from "drizzle-orm";
import {
  pendingChanges,
  listPendingInput,
  type ListPendingInput,
  type ListPendingResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import {
  listUserEditableSpacesInProject,
  requireProjectMember,
  type AuthContext
} from "../auth.js";

export const listPendingTool = {
  name: "list_pending",
  description:
    "List pending change proposals across every space in the project where the caller has editor role. Reviewers use this to drive the approve/reject loop.",
  inputSchema: listPendingInput
};

export async function handleListPending(
  db: Database,
  ctx: AuthContext,
  input: ListPendingInput
): Promise<ListPendingResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);
  const editorSpaces = await listUserEditableSpacesInProject(db, ctx.user.id, input.project_id);
  if (editorSpaces.length === 0) {
    return { changes: [] };
  }

  const rows = await db
    .select()
    .from(pendingChanges)
    .where(
      and(
        eq(pendingChanges.projectId, input.project_id),
        eq(pendingChanges.status, "pending"),
        inArray(pendingChanges.spaceId, editorSpaces)
      )
    )
    .orderBy(desc(pendingChanges.createdAt));

  return {
    changes: rows.map((r) => ({
      change_id: r.id,
      type: r.type as "new" | "edit" | "archive",
      space_id: r.spaceId,
      entry_id: r.entryId,
      proposed_title: r.proposedTitle,
      proposed_content: r.proposedContent,
      rationale: r.rationale,
      proposed_by: r.proposedBy,
      created_at: r.createdAt.toISOString()
    }))
  };
}
