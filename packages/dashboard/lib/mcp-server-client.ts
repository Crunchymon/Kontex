import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export async function callMcpToolServer(tool: string, input: unknown) {
  const baseUrl = process.env.MCP_SERVER_URL;
  if (!baseUrl) {
    throw new Error("MCP_SERVER_URL is not configured");
  }

  const client = new Client({
    name: "kontex-dashboard",
    version: "0.1.0"
  });

  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl.replace(/\/$/, "")}/mcp`));
  await client.connect(transport);
  const result = await client.callTool({
    name: tool,
    arguments: input as Record<string, unknown>
  });
  await client.close();
  return result;
}
