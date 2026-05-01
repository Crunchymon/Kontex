import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createGitHubClient } from "./github.js";
import { getEnv } from "./env.js";
import { readContextTool } from "./tools/readContext.js";
import { raisePrTool } from "./tools/raisePr.js";
import { listPrsTool } from "./tools/listPrs.js";
import { mergePrTool } from "./tools/mergePr.js";
import { closePrTool } from "./tools/closePr.js";
import { getHistoryTool } from "./tools/getHistory.js";

type ToolDef<TInput, TOutput> = {
  name: string;
  description: string;
  inputSchema: { parse: (value: unknown) => TInput };
  handler: (client: ReturnType<typeof createGitHubClient>, input: TInput) => Promise<TOutput>;
};

function registerTool<TInput, TOutput>(
  server: McpServer,
  client: ReturnType<typeof createGitHubClient>,
  tool: ToolDef<TInput, TOutput>
) {
  (server as any).registerTool(tool.name, {
    title: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as never
  }, async (input: unknown) => {
    const parsed = tool.inputSchema.parse(input);
    const result = await tool.handler(client, parsed);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result)
        }
      ]
    };
  });
}

export function createServer() {
  const env = getEnv();
  const client = createGitHubClient(env);
  const server = new McpServer({
    name: "kontex-mcp-server",
    version: "0.1.0"
  });

  registerTool(server, client, readContextTool);
  registerTool(server, client, raisePrTool);
  registerTool(server, client, listPrsTool);
  registerTool(server, client, mergePrTool);
  registerTool(server, client, closePrTool);
  registerTool(server, client, getHistoryTool);

  return server;
}
