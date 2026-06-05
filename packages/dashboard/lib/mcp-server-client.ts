import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { env } from "./env";

export type McpCallResult<T = unknown> =
  | { ok: true; result: T }
  | { ok: false; error: { code?: string; message: string; details?: unknown } };

export async function callMcpToolServer<T = unknown>(
  tool: string,
  input: unknown,
  apiKey: string
): Promise<McpCallResult<T>> {
  if (!apiKey) {
    return { ok: false, error: { code: "missing_api_key", message: "No API key on session" } };
  }

  const baseUrl = env.MCP_SERVER_URL().replace(/\/$/, "");
  const client = new Client({ name: "kontex-dashboard", version: "0.2.0" });
  const transport = new SSEClientTransport(new URL(`${baseUrl}/sse`), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    },
    eventSourceInit: {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    } as any
  });

  try {
    await client.connect(transport);
    const raw = (await client.callTool({
      name: tool,
      arguments: input as Record<string, unknown>
    })) as { content?: Array<{ type?: string; text?: string }>; isError?: boolean };

    const text = raw.content?.find((c) => c.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text) as Record<string, unknown>;

    if (raw.isError) {
      return {
        ok: false,
        error: {
          code: typeof parsed.error === "string" ? parsed.error : "tool_error",
          message: typeof parsed.message === "string" ? parsed.message : "Tool returned an error",
          details: parsed.details ?? null
        }
      };
    }

    return { ok: true, result: parsed as T };
  } catch (err) {
    return {
      ok: false,
      error: { message: err instanceof Error ? err.message : String(err) }
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}
