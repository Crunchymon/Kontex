import { and, eq } from "drizzle-orm";
import {
  entries,
  pendingChanges,
  proposeEditInput,
  MAX_ENTRY_CHARS,
  TOO_LONG_ERROR,
  type ProposeEditInput,
  type ProposeEditResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";

export const proposeEditTool = {
  name: "propose_edit",
  description:
    "Propose an edit to an existing entry. The LLM MUST first call query_context, surface the matched entry to the user, and obtain explicit confirmation before calling this tool. Content is hard-capped at 1500 characters.",
  inputSchema: proposeEditInput
};

export async function handleProposeEdit(
  db: Database,
  ctx: AuthContext,
  input: ProposeEditInput
): Promise<ProposeEditResult> {
  if (input.new_content.length > MAX_ENTRY_CHARS) {
    throw new KontexError(
      "validation",
      "Entry too long. Break this into smaller entries — one concept per entry.",
      TOO_LONG_ERROR(input.new_content.length)
    );
  }

  await requireProjectMember(db, ctx.user.id, input.project_id);

  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, input.entry_id), eq(entries.projectId, input.project_id)))
    .limit(1);

  if (!entry) {
    throw new KontexError("not_found", "Entry not found in this project");
  }

  await requireSpaceEditor(db, ctx.user.id, entry.spaceId, input.project_id);

  const [row] = await db
    .insert(pendingChanges)
    .values({
      projectId: entry.projectId,
      spaceId: entry.spaceId,
      type: "edit",
      entryId: entry.id,
      proposedContent: input.new_content,
      proposedTitle: input.new_title ?? null,
      proposedBy: ctx.user.id,
      rationale: input.rationale,
      status: "pending"
    })
    .returning({ id: pendingChanges.id });

  return {
    change_id: row.id,
    status: "pending",
    entry_title: entry.title,
    summary: "Edit proposed to existing entry. Awaiting approval."
  };
}
