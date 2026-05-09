import {
  pendingChanges,
  proposeEntryInput,
  MAX_ENTRY_CHARS,
  TOO_LONG_ERROR,
  type ProposeEntryInput,
  type ProposeEntryResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";

export const proposeEntryTool = {
  name: "propose_entry",
  description:
    "Submit a new entry for human approval. Content is hard-capped at 1500 characters; longer submissions are rejected so the caller can split them into smaller, single-concept entries.",
  inputSchema: proposeEntryInput
};

export async function handleProposeEntry(
  db: Database,
  ctx: AuthContext,
  input: ProposeEntryInput
): Promise<ProposeEntryResult> {
  if (input.content.length > MAX_ENTRY_CHARS) {
    throw new KontexError(
      "validation",
      "Entry too long. Break this into smaller entries — one concept per entry.",
      TOO_LONG_ERROR(input.content.length)
    );
  }

  await requireProjectMember(db, ctx.user.id, input.project_id);
  await requireSpaceEditor(db, ctx.user.id, input.space_id, input.project_id);

  const [row] = await db
    .insert(pendingChanges)
    .values({
      projectId: input.project_id,
      spaceId: input.space_id,
      type: "new",
      proposedContent: input.content,
      proposedTitle: input.title ?? null,
      proposedBy: ctx.user.id,
      rationale: input.rationale,
      status: "pending"
    })
    .returning({ id: pendingChanges.id });

  return {
    change_id: row.id,
    status: "pending"
  };
}
