import { describe, expect, it, vi, beforeEach } from "vitest";
import { readContextTool } from "../src/tools/readContext.js";
import { raisePrTool } from "../src/tools/raisePr.js";
import { listPrsTool } from "../src/tools/listPrs.js";
import { mergePrTool } from "../src/tools/mergePr.js";
import { closePrTool } from "../src/tools/closePr.js";
import { getHistoryTool } from "../src/tools/getHistory.js";

vi.mock("../src/github.js", () => ({
  getContext: vi.fn(),
  raisePr: vi.fn(),
  listPrs: vi.fn(),
  mergePr: vi.fn(),
  closePr: vi.fn(),
  getHistory: vi.fn()
}));

import * as github from "../src/github.js";

const fakeClient = {} as never;

describe("tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("read_context passes sha through", async () => {
    vi.mocked(github.getContext).mockResolvedValueOnce({ content: "c", sha: "abc" });
    const out = await readContextTool.handler(fakeClient, { sha: "abc" });
    expect(github.getContext).toHaveBeenCalledWith(fakeClient, "abc");
    expect(out).toEqual({ content: "c", sha: "abc" });
  });

  it("raise_pr maps fields", async () => {
    vi.mocked(github.raisePr).mockResolvedValueOnce({ pr_number: 1, pr_url: "u", branch_name: "kontex/x" });
    const out = await raisePrTool.handler(fakeClient, { proposed_content: "new", description: "desc" });
    expect(github.raisePr).toHaveBeenCalledWith(fakeClient, "new", "desc");
    expect(out.pr_number).toBe(1);
  });

  it("list_prs returns list from github layer", async () => {
    vi.mocked(github.listPrs).mockResolvedValueOnce([]);
    const out = await listPrsTool.handler(fakeClient);
    expect(github.listPrs).toHaveBeenCalledWith(fakeClient);
    expect(out).toEqual([]);
  });

  it("merge_pr calls github merge", async () => {
    vi.mocked(github.mergePr).mockResolvedValueOnce({ merged: true, sha: "m1" });
    const out = await mergePrTool.handler(fakeClient, { pr_number: 4 });
    expect(github.mergePr).toHaveBeenCalledWith(fakeClient, 4);
    expect(out.merged).toBe(true);
  });

  it("close_pr calls github close", async () => {
    vi.mocked(github.closePr).mockResolvedValueOnce({ closed: true });
    const out = await closePrTool.handler(fakeClient, { pr_number: 8 });
    expect(github.closePr).toHaveBeenCalledWith(fakeClient, 8);
    expect(out.closed).toBe(true);
  });

  it("get_history returns merged entries", async () => {
    vi.mocked(github.getHistory).mockResolvedValueOnce([{ pr_number: 3, description: "d", merged_at: "x", sha: "s" }]);
    const out = await getHistoryTool.handler(fakeClient);
    expect(github.getHistory).toHaveBeenCalledWith(fakeClient);
    expect(out).toHaveLength(1);
  });
});
