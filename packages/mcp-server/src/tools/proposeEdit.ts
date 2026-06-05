import { and, eq } from "drizzle-orm";
import {
  entries,
  branches,
  branchEntries,
  proposals,
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
  title: "Propose Edit",
  description: "Propose an edit to an existing entry. Content is hard-capped at 1500 characters.",
  inputSchema: proposeEditInput,
  destructiveHint: true
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

  // Create branch
  const [branch] = await db
    .insert(branches)
    .values({
      spaceId: entry.spaceId,
      name: input.rationale,
      createdBy: ctx.user.id,
      status: "open"
    })
    .returning();

  // Create branch entry
  await db.insert(branchEntries).values({
    branchId: branch.id,
    type: "edit",
    entryId: entry.id,
    proposedContent: input.new_content,
    proposedTitle: input.new_title ?? null
  });

  // Create proposal
  const [proposal] = await db
    .insert(proposals)
    .values({
      branchId: branch.id,
      status: "pending"
    })
    .returning();

  if (spaceRole === "editor") {
    const approved = await applyApproval(db, embeddings, proposal, branch, ctx.user.id, "Auto-approved by editor");
    return {
      status: "approved",
      resolved: true,
      entry_id: approved.entryId,
      entry_title: entry.title
    };
  } else {
    return {
      proposal_id: proposal.id,
      status: "pending",
      entry_title: entry.title
    };
  }
}
