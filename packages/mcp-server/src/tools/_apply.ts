import { eq } from "drizzle-orm";
import { entries, entryVersions, branches, proposals, branchEntries, spaces, type Proposal, type Branch } from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { KontexError } from "../errors.js";

export async function applyApproval(
  db: Database,
  embeddings: EmbeddingClient,
  proposal: Proposal,
  branch: Branch,
  reviewerId: string,
  reason?: string
): Promise<{ entryId: string | null }> {
  const bEntries = await db.select().from(branchEntries).where(eq(branchEntries.branchId, branch.id));

  const [space] = await db.select().from(spaces).where(eq(spaces.id, branch.spaceId)).limit(1);
  if (!space) {
    throw new KontexError("internal", "Space not found for branch");
  }

  let lastEntryId: string | null = null;

  for (const change of bEntries) {
    if (change.type === "new") {
      if (!change.proposedContent) {
        throw new KontexError("internal", "New change is missing proposedContent");
      }
      const embedding = await embeddings.embed(change.proposedContent);
      const [created] = await db
        .insert(entries)
        .values({
          projectId: space.projectId,
          spaceId: branch.spaceId,
          title: change.proposedTitle ?? null,
          content: change.proposedContent,
          embedding,
          status: "active",
          createdBy: branch.createdBy
        })
        .returning({ id: entries.id });

      lastEntryId = created.id;
    } else if (change.type === "edit") {
      if (!change.entryId || !change.proposedContent) {
        throw new KontexError("internal", "Edit change is missing entryId or proposedContent");
      }
      const [existing] = await db.select().from(entries).where(eq(entries.id, change.entryId)).limit(1);
      if (!existing) {
        throw new KontexError("not_found", "Target entry no longer exists");
      }

      const priorVersionRows = await db
        .select({ id: entryVersions.id })
        .from(entryVersions)
        .where(eq(entryVersions.entryId, existing.id));
      const nextVersion = priorVersionRows.length + 1;

      await db.insert(entryVersions).values({
        entryId: existing.id,
        content: existing.content,
        title: existing.title ?? null,
        changedBy: branch.createdBy,
        rationale: branch.name, // using branch name as rationale
        version: nextVersion
      });

      const embedding = await embeddings.embed(change.proposedContent);
      await db
        .update(entries)
        .set({
          content: change.proposedContent,
          title: change.proposedTitle ?? existing.title,
          embedding
        })
        .where(eq(entries.id, existing.id));

      lastEntryId = existing.id;
    } else if (change.type === "archive") {
      if (!change.entryId) {
        throw new KontexError("internal", "Archive change is missing entryId");
      }
      await db.update(entries).set({ status: "archived" }).where(eq(entries.id, change.entryId));
      lastEntryId = change.entryId;
    }
  }

  // Update proposal
  await db
    .update(proposals)
    .set({
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewReason: reason ?? null
    })
    .where(eq(proposals.id, proposal.id));

  // Update branch
  await db
    .update(branches)
    .set({
      status: "merged"
    })
    .where(eq(branches.id, branch.id));

  return { entryId: lastEntryId };
}
