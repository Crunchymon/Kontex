import { eq } from "drizzle-orm";
import {
  branches,
  branchEntries,
  proposals,
  proposeEntryInput,
  MAX_ENTRY_CHARS,
  TOO_LONG_ERROR,
  type ProposeEntryInput,
  type ProposeEntryResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { requireProjectMember, getSpaceRole, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";
import { applyApproval } from "./_apply.js";

export const proposeEntryTool = {
  name: "propose_entry",
  title: "Propose Entry",
  description: "Submit a new entry to the knowledge base. Content is hard-capped at 1500 characters.",
  inputSchema: proposeEntryInput,
  destructiveHint: true
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
  const spaceRole = await getSpaceRole(db, ctx.user.id, input.space_id, input.project_id);
  if (!spaceRole) {
    throw new KontexError("not_space_member", "User has no role in this space");
  }

  // Create branch
  const [branch] = await db
    .insert(branches)
    .values({
      spaceId: input.space_id,
      name: input.rationale,
      createdBy: ctx.user.id,
      status: "open"
    })
    .returning();

  // Create branch entry
  await db.insert(branchEntries).values({
    branchId: branch.id,
    type: "new",
    proposedContent: input.content,
    proposedTitle: input.title ?? null
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
    return { status: "approved", resolved: true, entry_id: approved.entryId };
  } else {
    return { proposal_id: proposal.id, status: "pending" };
  }
}
