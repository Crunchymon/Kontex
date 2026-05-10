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
import { handleListProjects, listProjectsTool } from "./tools/listProjects.js";
import { handleListSpaces, listSpacesTool } from "./tools/listSpaces.js";
import { handleListMembers, listMembersTool } from "./tools/listMembers.js";
import { handleCreateProject, createProjectTool } from "./tools/createProject.js";
import { handleCreateSpace, createSpaceTool } from "./tools/createSpace.js";
import { handleInviteMember, inviteMemberTool } from "./tools/inviteMember.js";
import { handleSetProjectRole, setProjectRoleTool } from "./tools/setProjectRole.js";
import { handleSetSpaceRole, setSpaceRoleTool } from "./tools/setSpaceRole.js";

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
  const server = new McpServer({
    name: "kontex-mcp-server",
    version: "0.3.0",
    description: `You have access to Kontex, this team's shared institutional memory.

Discovery: call list_projects first to find the project_id and project_role, then list_spaces to find space_ids and your role in those spaces.

When to write: use propose_edit / propose_entry / propose_archive when the conversation contains decisions, new information, progress updates, or observations useful to teammates and future sessions.

Before any propose_*, run query_context to check for existing similar entries. Prefer propose_edit over creating duplicates.

Never propose without user confirmation. Do not propose for casual chat or simple Q&A with no new durable information.

Tool semantics: editors who call propose_* apply changes immediately in the same call. Readers who call propose_edit create a pending proposal that an editor must review.`
  });

  registerTool(server, listProjectsTool, (input) => handleListProjects(deps.db, deps.ctx, input));
  registerTool(server, listSpacesTool, (input) => handleListSpaces(deps.db, deps.ctx, input));
  registerTool(server, listMembersTool, (input) => handleListMembers(deps.db, deps.ctx, input));
  registerTool(server, createProjectTool, (input) => handleCreateProject(deps.db, deps.ctx, input));
  registerTool(server, createSpaceTool, (input) => handleCreateSpace(deps.db, deps.ctx, input));
  registerTool(server, inviteMemberTool, (input) => handleInviteMember(deps.db, deps.ctx, input));
  registerTool(server, setProjectRoleTool, (input) =>
    handleSetProjectRole(deps.db, deps.ctx, input)
  );
  registerTool(server, setSpaceRoleTool, (input) => handleSetSpaceRole(deps.db, deps.ctx, input));

  registerTool(server, queryContextTool, (input) =>
    handleQueryContext(deps.db, deps.embeddings, deps.ctx, input)
  );
  registerTool(server, getEntryTool, (input) => handleGetEntry(deps.db, deps.ctx, input));
  registerTool(server, listRecentTool, (input) => handleListRecent(deps.db, deps.ctx, input));
  registerTool(server, listPendingTool, (input) => handleListPending(deps.db, deps.ctx, input));
  registerTool(server, proposeEntryTool, (input) =>
    handleProposeEntry(deps.db, deps.embeddings, deps.ctx, input)
  );
  registerTool(server, proposeEditTool, (input) =>
    handleProposeEdit(deps.db, deps.embeddings, deps.ctx, input)
  );
  registerTool(server, proposeArchiveTool, (input) =>
    handleProposeArchive(deps.db, deps.embeddings, deps.ctx, input)
  );
  registerTool(server, resolveChangeTool, (input) =>
    handleResolveChange(deps.db, deps.embeddings, deps.ctx, input)
  );

  return server;
}
