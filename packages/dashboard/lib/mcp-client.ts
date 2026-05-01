import type { ToolInput, ToolName, ToolOutput } from "../../shared/src";

async function callTool<T extends ToolName>(tool: T, input: ToolInput<T>): Promise<ToolOutput<T>> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, input })
  });
  if (!res.ok) {
    throw new Error(`MCP call failed (${res.status})`);
  }
  const json = (await res.json()) as { result: ToolOutput<T> };
  return json.result;
}

export const mcpClient = {
  readContext(input: ToolInput<"read_context"> = {}) {
    return callTool("read_context", input);
  },
  raisePr(input: ToolInput<"raise_pr">) {
    return callTool("raise_pr", input);
  },
  listPrs() {
    return callTool("list_prs", {});
  },
  mergePr(input: ToolInput<"merge_pr">) {
    return callTool("merge_pr", input);
  },
  closePr(input: ToolInput<"close_pr">) {
    return callTool("close_pr", input);
  },
  getHistory() {
    return callTool("get_history", {});
  },
  async rollbackTo(sha: string) {
    const snapshot = await callTool("read_context", { sha });
    return callTool("raise_pr", {
      proposed_content: snapshot.content,
      description: `Rollback to ${sha.slice(0, 8)}`
    });
  }
};
