import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Database } from "./db.js";
import type { EmbeddingClient } from "./embeddings.js";
import type { AuthContext } from "./auth.js";
import { KontexError } from "./errors.js";
import { handleQueryContext, queryContextTool } from "./tools/queryContext.js";
import { handleProposeEntry, proposeEntryTool } from "./tools/proposeEntry.js";
import { handleResolveChange, resolveChangeTool } from "./tools/resolveChange.js";
import { handleGetEntry, getEntryTool } from "./tools/getEntry.js";
import { handleListRecent, listRecentTool } from "./tools/listRecent.js";
import { handleListPending, listPendingTool } from "./tools/listPending.js";
import { handleProposeEdit, proposeEditTool } from "./tools/proposeEdit.js";
import { handleProposeArchive, proposeArchiveTool } from "./tools/proposeArchive.js";

export type ServerDeps = {
  db: Database;
  embeddings: EmbeddingClient;
  ctx: AuthContext;
};

type ToolDef<TInput> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
};

function registerTool<TInput, TOutput>(
  server: McpServer,
  tool: ToolDef<TInput>,
  handler: (input: TInput) => Promise<TOutput>
) {
  const shape =
    tool.inputSchema instanceof z.ZodObject ? (tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape : {};

  (server as unknown as {
    registerTool: (
      name: string,
      cfg: { title: string; description: string; inputSchema: z.ZodRawShape },
      cb: (input: unknown) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>
    ) => void;
  }).registerTool(
    tool.name,
    { title: tool.name, description: tool.description, inputSchema: shape },
    async (input: unknown) => {
      try {
        const parsed = tool.inputSchema.parse(input);
        const result = await handler(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      } catch (err) {
        const payload =
          err instanceof KontexError
            ? { error: err.code, message: err.message, details: err.details ?? null }
            : err instanceof z.ZodError
            ? { error: "validation", message: "Invalid tool input", details: err.flatten() }
            : { error: "internal", message: err instanceof Error ? err.message : String(err) };
        return {
          content: [{ type: "text", text: JSON.stringify(payload) }],
          isError: true
        };
      }
    }
  );
}

export function createServer(deps: ServerDeps): McpServer {
  const server = new McpServer({ name: "kontex-mcp-server", version: "0.2.0" });

  registerTool(server, queryContextTool, (input) =>
    handleQueryContext(deps.db, deps.embeddings, deps.ctx, input)
  );
  registerTool(server, getEntryTool, (input) => handleGetEntry(deps.db, deps.ctx, input));
  registerTool(server, listRecentTool, (input) => handleListRecent(deps.db, deps.ctx, input));
  registerTool(server, listPendingTool, (input) => handleListPending(deps.db, deps.ctx, input));
  registerTool(server, proposeEntryTool, (input) => handleProposeEntry(deps.db, deps.ctx, input));
  registerTool(server, proposeEditTool, (input) => handleProposeEdit(deps.db, deps.ctx, input));
  registerTool(server, proposeArchiveTool, (input) =>
    handleProposeArchive(deps.db, deps.ctx, input)
  );
  registerTool(server, resolveChangeTool, (input) =>
    handleResolveChange(deps.db, deps.embeddings, deps.ctx, input)
  );

  return server;
}
