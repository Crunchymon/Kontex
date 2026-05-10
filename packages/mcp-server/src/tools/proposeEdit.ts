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
import type { EmbeddingClient } from "../embeddings.js";
import { getSpaceRole, requireProjectMember, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";
import { applyApproval } from "./_apply.js";

export const proposeEditTool = {
  name: "propose_edit",
  description:
    "Propose an edit to an existing entry. Editors auto-apply this in the same call; readers can submit a pending proposal for editor review. Content is hard-capped at 1500 characters.",
  inputSchema: proposeEditInput
};

export async function handleProposeEdit(
  db: Database,
  embeddings: EmbeddingClient,
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

  const spaceRole = await getSpaceRole(db, ctx.user.id, entry.spaceId, input.project_id);
  if (!spaceRole) {
    throw new KontexError("not_space_member", "User has no role in this space");
  }

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

  if (spaceRole === "reader") {
    return {
      change_id: row.id,
      status: "pending",
      entry_title: entry.title,
      summary: "Edit proposal queued. A space editor will review and merge it."
    };
  }

  const [change] = await db.select().from(pendingChanges).where(eq(pendingChanges.id, row.id)).limit(1);
  if (!change) {
    throw new KontexError("internal", "Pending change not found after creation");
  }
  const approved = await applyApproval(db, embeddings, change, ctx.user.id, "Auto-approved by editor");
  return {
    status: "resolved",
    resolved: true,
    decision: "approve",
    entry_id: approved.entryId,
    entry_title: entry.title,
    summary: "Edit applied immediately because caller is a space editor."
  };
}
