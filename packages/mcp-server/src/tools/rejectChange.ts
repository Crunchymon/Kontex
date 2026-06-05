import { eq } from "drizzle-orm";
import {
  proposals,
  branches,
  rejectChangeInput,
  type RejectChangeInput,
  type RejectChangeResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";

export const rejectChangeTool = {
  name: "reject_change",
  title: "Reject Change",
  description: "Reject a pending proposal without applying its changes.",
  inputSchema: rejectChangeInput,
  destructiveHint: true
};

export async function handleRejectChange(
  db: Database,
  ctx: AuthContext,
  input: RejectChangeInput
): Promise<RejectChangeResult> {
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

  // Update proposal
  await db
    .update(proposals)
    .set({
      status: "rejected",
      reviewedBy: ctx.user.id,
      reviewedAt: new Date(),
      reviewReason: input.reason ?? null
    })
    .where(eq(proposals.id, proposal.id));

  // Update branch
  await db
    .update(branches)
    .set({
      status: "closed"
    })
    .where(eq(branches.id, branch.id));

  return {
    resolved: true,
    status: "rejected"
  };
}
