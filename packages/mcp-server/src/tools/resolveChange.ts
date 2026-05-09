import { and, eq } from "drizzle-orm";
import {
  entries,
  entryVersions,
  pendingChanges,
  resolveChangeInput,
  type ResolveChangeInput,
  type ResolveChangeResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";

export const resolveChangeTool = {
  name: "resolve_change",
  description:
    "Approve or reject a pending change (new entry, edit, or archive). Approving runs the embedding/version logic atomically; rejecting only records the decision and reason.",
  inputSchema: resolveChangeInput
};

export async function handleResolveChange(
  db: Database,
  embeddings: EmbeddingClient,
  ctx: AuthContext,
  input: ResolveChangeInput
): Promise<ResolveChangeResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);

  const [change] = await db
    .select()
    .from(pendingChanges)
    .where(and(eq(pendingChanges.id, input.change_id), eq(pendingChanges.projectId, input.project_id)))
    .limit(1);

  if (!change) {
    throw new KontexError("not_found", "Pending change not found in this project");
  }
  if (change.status !== "pending") {
    throw new KontexError("validation", `Change is already ${change.status}`);
  }

  await requireSpaceEditor(db, ctx.user.id, change.spaceId, input.project_id);

  if (input.decision === "reject") {
    await db
      .update(pendingChanges)
      .set({
        status: "rejected",
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        reviewReason: input.reason ?? null
      })
      .where(eq(pendingChanges.id, change.id));

    return { resolved: true, decision: "reject", entry_id: change.entryId };
  }

  // approve path — branch on type
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
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        reviewReason: input.reason ?? null
      })
      .where(eq(pendingChanges.id, change.id));

    return { resolved: true, decision: "approve", entry_id: created.id };
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
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        reviewReason: input.reason ?? null
      })
      .where(eq(pendingChanges.id, change.id));

    return { resolved: true, decision: "approve", entry_id: existing.id };
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
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        reviewReason: input.reason ?? null
      })
      .where(eq(pendingChanges.id, change.id));

    return { resolved: true, decision: "approve", entry_id: change.entryId };
  }

  throw new KontexError("internal", `Unknown change type: ${change.type as string}`);
}
