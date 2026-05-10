import { eq } from "drizzle-orm";
import { entries, entryVersions, pendingChanges, type PendingChange } from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { KontexError } from "../errors.js";

export async function applyApproval(
  db: Database,
  embeddings: EmbeddingClient,
  change: PendingChange,
  reviewerId: string,
  reason?: string
): Promise<{ entryId: string | null }> {
  if (change.type === "new") {
    if (!change.proposedContent) {
      throw new KontexError("internal", "New change is missing proposedContent");
    }
    const embedding = await embeddings.embed(change.proposedContent);
    const [created] = await db
      .insert(entries)
      .values({
        projectId: change.projectId,
        spaceId: change.spaceId,
        title: change.proposedTitle ?? null,
        content: change.proposedContent,
        embedding,
        status: "active",
        createdBy: change.proposedBy
      })
      .returning({ id: entries.id });

    await db
      .update(pendingChanges)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewReason: reason ?? null
      })
      .where(eq(pendingChanges.id, change.id));

    return { entryId: created.id };
  }

  if (change.type === "edit") {
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
      changedBy: change.proposedBy,
      rationale: change.rationale,
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

    await db
      .update(pendingChanges)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewReason: reason ?? null
      })
      .where(eq(pendingChanges.id, change.id));

    return { entryId: existing.id };
  }

  if (change.type === "archive") {
    if (!change.entryId) {
      throw new KontexError("internal", "Archive change is missing entryId");
    }
    await db.update(entries).set({ status: "archived" }).where(eq(entries.id, change.entryId));
    await db
      .update(pendingChanges)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewReason: reason ?? null
      })
      .where(eq(pendingChanges.id, change.id));

    return { entryId: change.entryId };
  }

  throw new KontexError("internal", `Unknown change type: ${change.type as string}`);
}
