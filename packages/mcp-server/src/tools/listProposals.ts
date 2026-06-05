import { and, desc, eq, inArray } from "drizzle-orm";
import {
  proposals,
  branches,
  branchEntries,
  listProposalsInput,
  type ListProposalsInput,
  type ListProposalsResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import {
  listUserEditableSpacesInProject,
  requireProjectMember,
  type AuthContext
} from "../auth.js";

export const listProposalsTool = {
  name: "list_proposals",
  title: "List Proposals",
  description: "List pending change proposals across every space in the project where the caller has editor role.",
  inputSchema: listProposalsInput,
  readOnlyHint: true
};

export async function handleListProposals(
  db: Database,
  ctx: AuthContext,
  input: ListProposalsInput
): Promise<ListProposalsResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);
  const editorSpaces = await listUserEditableSpacesInProject(db, ctx.user.id, input.project_id);
  if (editorSpaces.length === 0) {
    return { proposals: [] };
  }

  const proposalsList = await db
    .select({
      proposalId: proposals.id,
      branchId: proposals.branchId,
      status: proposals.status,
      createdAt: proposals.createdAt,
      spaceId: branches.spaceId
    })
    .from(proposals)
    .innerJoin(branches, eq(proposals.branchId, branches.id))
    .where(
      and(
        eq(proposals.status, "pending"),
        inArray(branches.spaceId, editorSpaces)
      )
    )
    .orderBy(desc(proposals.createdAt));

  const resultProposals = [];
  
  for (const p of proposalsList) {
    const entriesRows = await db
      .select()
      .from(branchEntries)
      .where(eq(branchEntries.branchId, p.branchId));
      
    resultProposals.push({
      proposal_id: p.proposalId,
      branch_id: p.branchId,
      space_id: p.spaceId,
      status: p.status as "pending" | "approved" | "rejected",
      created_at: p.createdAt.toISOString(),
      changes: entriesRows.map((e) => ({
        entry_id: e.entryId,
        type: e.type as "new" | "edit" | "archive",
        proposed_title: e.proposedTitle,
        proposed_content: e.proposedContent
      }))
    });
  }

  return {
    proposals: resultProposals
  };
}
