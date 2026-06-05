import { eq } from "drizzle-orm";
import {
  proposals,
  branches,
  approveChangeInput,
  type ApproveChangeInput,
  type ApproveChangeResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";
import { applyApproval } from "./_apply.js";

export const approveChangeTool = {
  name: "approve_change",
  title: "Approve Change",
  description: "Approve a pending proposal and apply its changes.",
  inputSchema: approveChangeInput,
  destructiveHint: true
};

export async function handleApproveChange(
  db: Database,
  embeddings: EmbeddingClient,
  ctx: AuthContext,
  input: ApproveChangeInput
): Promise<ApproveChangeResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);

  const [proposal] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.id, input.proposal_id))
    .limit(1);

  if (!proposal) {
    throw new KontexError("not_found", "Proposal not found");
  }

  if (proposal.status !== "pending") {
    throw new KontexError("validation", `Proposal is already ${proposal.status}`);
  }

  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, proposal.branchId))
    .limit(1);

  if (!branch) {
    throw new KontexError("internal", "Branch not found for proposal");
  }

  await requireSpaceEditor(db, ctx.user.id, branch.spaceId, input.project_id);

  await applyApproval(db, embeddings, proposal, branch, ctx.user.id, input.reason);

  return {
    resolved: true,
    status: "approved"
  };
}
