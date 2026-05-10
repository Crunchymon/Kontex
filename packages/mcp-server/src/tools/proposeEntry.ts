import { eq } from "drizzle-orm";
import {
  pendingChanges,
  proposeEntryInput,
  MAX_ENTRY_CHARS,
  TOO_LONG_ERROR,
  type ProposeEntryInput,
  type ProposeEntryResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";
import { applyApproval } from "./_apply.js";

export const proposeEntryTool = {
  name: "propose_entry",
  description:
    "Submit a new entry. Space editors auto-apply the change in this same call; callers without editor role are rejected. Content is hard-capped at 1500 characters.",
  inputSchema: proposeEntryInput
};

export async function handleProposeEntry(
  db: Database,
  embeddings: EmbeddingClient,
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

  const [change] = await db.select().from(pendingChanges).where(eq(pendingChanges.id, row.id)).limit(1);
  if (!change) {
    throw new KontexError("internal", "Pending change not found after creation");
  }
  const approved = await applyApproval(db, embeddings, change, ctx.user.id, "Auto-approved by editor");
  return { status: "resolved", resolved: true, decision: "approve", entry_id: approved.entryId };
}
