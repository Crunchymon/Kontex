import { and, eq } from "drizzle-orm";
import { pendingChanges, resolveChangeInput, type ResolveChangeInput, type ResolveChangeResult } from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";
import { applyApproval } from "./_apply.js";

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

  const approved = await applyApproval(db, embeddings, change, ctx.user.id, input.reason);
  return { resolved: true, decision: "approve", entry_id: approved.entryId };
}
