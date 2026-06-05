import { and, eq } from "drizzle-orm";
import {
  entries,
  branches,
  branchEntries,
  proposals,
  proposeArchiveInput,
  type ProposeArchiveInput,
  type ProposeArchiveResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { getSpaceRole, requireProjectMember, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";
import { applyApproval } from "./_apply.js";

export const proposeArchiveTool = {
  name: "propose_archive",
  title: "Propose Archive",
  description: "Propose archiving an existing entry.",
  inputSchema: proposeArchiveInput,
  destructiveHint: true
};

export async function handleProposeArchive(
  db: Database,
  embeddings: EmbeddingClient,
  ctx: AuthContext,
  input: ProposeArchiveInput
): Promise<ProposeArchiveResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);

  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, input.entry_id), eq(entries.projectId, input.project_id)))
    .limit(1);

  if (!entry) {
    throw new KontexError("not_found", "Entry not found in this project");
  }
  if (entry.status === "archived") {
    throw new KontexError("validation", "Entry is already archived");
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
    type: "archive",
    entryId: entry.id
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
