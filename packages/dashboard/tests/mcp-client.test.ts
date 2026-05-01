import { describe, expect, it, vi, beforeEach } from "vitest";
import { mcpClient } from "../lib/mcp-client";

describe("mcp-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends expected payload for readContext", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ result: { content: "abc", sha: "s1" } }), { status: 200 })
    );
    const out = await mcpClient.readContext();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mcp",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(out.sha).toBe("s1");
  });

  it("rollbackTo reads snapshot then raises PR", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { content: "old", sha: "x" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { pr_number: 1, pr_url: "u", branch_name: "b" } }), { status: 200 }));
    await mcpClient.rollbackTo("abc12345");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
