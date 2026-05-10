import { and, eq } from "drizzle-orm";
import {
  entries,
  pendingChanges,
  proposeArchiveInput,
  type ProposeArchiveInput,
  type ProposeArchiveResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";
import { applyApproval } from "./_apply.js";

export const proposeArchiveTool = {
  name: "propose_archive",
  description:
    "Propose archiving an existing entry. Space editors auto-apply the archive in this same call; callers without editor role are rejected.",
  inputSchema: proposeArchiveInput
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

  await requireSpaceEditor(db, ctx.user.id, entry.spaceId, input.project_id);

  const [row] = await db
    .insert(pendingChanges)
    .values({
      projectId: entry.projectId,
      spaceId: entry.spaceId,
      type: "archive",
      entryId: entry.id,
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
  return {
    status: "resolved",
    resolved: true,
    decision: "approve",
    entry_id: approved.entryId,
    entry_title: entry.title,
    summary: "Archive applied immediately because caller is a space editor."
  };
}
