import { and, eq, inArray, sql } from "drizzle-orm";
import {
  entries,
  queryContextInput,
  type QueryContextInput,
  type QueryContextResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import type { EmbeddingClient } from "../embeddings.js";
import {
  listUserSpacesInProject,
  requireProjectMember,
  requireSpaceMember,
  type AuthContext
} from "../auth.js";
import { KontexError } from "../errors.js";

export const queryContextTool = {
  name: "query_context",
  title: "Query Context",
  description: "Semantic search over the project's entries. Returns the most similar active entries the caller has read access to, optionally narrowed to a single space.",
  inputSchema: queryContextInput,
  readOnlyHint: true
};

export async function handleQueryContext(
  db: Database,
  embeddings: EmbeddingClient,
  ctx: AuthContext,
  input: QueryContextInput
): Promise<QueryContextResult> {
  await requireProjectMember(db, ctx.user.id, input.project_id);

  let allowedSpaces: string[];
  if (input.space_id) {
    await requireSpaceMember(db, ctx.user.id, input.space_id, input.project_id);
    allowedSpaces = [input.space_id];
  } else {
    allowedSpaces = await listUserSpacesInProject(db, ctx.user.id, input.project_id);
  }

  if (allowedSpaces.length === 0) {
    return { results: [] };
  }

  const queryEmbedding = await embeddings.embed(input.query);
  const limit = input.limit ?? 20;
  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await db
    .select({
      id: entries.id,
      title: entries.title,
      content: entries.content,
      spaceId: entries.spaceId,
      createdAt: entries.createdAt,
      similarity: sql<number>`1 - (${entries.embedding} <=> ${embeddingLiteral}::vector)`
    })
    .from(entries)
    .where(
      and(
        eq(entries.projectId, input.project_id),
        inArray(entries.spaceId, allowedSpaces),
        eq(entries.status, "active")
      )
    )
    .orderBy(sql`${entries.embedding} <=> ${embeddingLiteral}::vector`)
    .limit(limit);

  return {
    results: rows.map((r) => ({
      entry_id: r.id,
      title: r.title,
      content: r.content,
      space_id: r.spaceId,
      similarity_score: typeof r.similarity === "number" ? r.similarity : Number(r.similarity),
      created_at: r.createdAt.toISOString()
    }))
  };
}

export { KontexError };
