import { and, eq } from "drizzle-orm";
import {
  entries,
  pendingChanges,
  proposeArchiveInput,
  type ProposeArchiveInput,
  type ProposeArchiveResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectMember, requireSpaceEditor, type AuthContext } from "../auth.js";
import { KontexError } from "../errors.js";

export const proposeArchiveTool = {
  name: "propose_archive",
  description:
    "Propose archiving an existing entry. Same confirmation flow as propose_edit: the LLM must surface the matched entry to the user and get explicit confirmation before calling this tool.",
  inputSchema: proposeArchiveInput
};

export async function handleProposeArchive(
  db: Database,
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

  return {
    change_id: row.id,
    status: "pending",
    entry_title: entry.title,
    summary: "Archive proposed for existing entry. Awaiting approval."
  };
}
