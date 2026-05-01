import { describe, expect, it, vi } from "vitest";
import { getContext, listPrs, mergePr, closePr, getHistory } from "../src/github.js";

function mockClient() {
  return {
    owner: "o",
    repo: "r",
    contextPath: "context.txt",
    octokit: {
      repos: {
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn()
      },
      pulls: {
        list: vi.fn(),
        merge: vi.fn(),
        update: vi.fn(),
        create: vi.fn()
      },
      git: {
        getRef: vi.fn(),
        createRef: vi.fn()
      }
    }
  } as never;
}

describe("github helpers", () => {
  it("getContext decodes base64 content", async () => {
    const client = mockClient();
    vi.mocked(client.octokit.repos.getContent).mockResolvedValueOnce({
      data: { content: Buffer.from("hello").toString("base64"), sha: "sha1" }
    });
    const out = await getContext(client, "main");
    expect(client.octokit.repos.getContent).toHaveBeenCalled();
    expect(out).toEqual({ content: "hello", sha: "sha1" });
  });

  it("listPrs filters kontex branches", async () => {
    const client = mockClient();
    vi.mocked(client.octokit.pulls.list).mockResolvedValueOnce({
      data: [
        { number: 1, head: { ref: "kontex/a", sha: "h1" }, base: { sha: "b1" }, title: "t", body: "d", created_at: "c" },
        { number: 2, head: { ref: "feature/x", sha: "h2" }, base: { sha: "b2" }, title: "t2", body: "d2", created_at: "c2" }
      ]
    });
    vi.mocked(client.octokit.repos.getContent)
      .mockResolvedValueOnce({ data: { content: Buffer.from("base").toString("base64"), sha: "b1" } })
      .mockResolvedValueOnce({ data: { content: Buffer.from("head").toString("base64"), sha: "h1" } });
    const out = await listPrs(client);
    expect(out).toHaveLength(1);
    expect(out[0]?.base_content).toBe("base");
  });

  it("mergePr calls squash merge", async () => {
    const client = mockClient();
    vi.mocked(client.octokit.pulls.merge).mockResolvedValueOnce({ data: { sha: "msha" } });
    const out = await mergePr(client, 7);
    expect(client.octokit.pulls.merge).toHaveBeenCalledWith(expect.objectContaining({ merge_method: "squash" }));
    expect(out.sha).toBe("msha");
  });

  it("closePr closes open PR", async () => {
    const client = mockClient();
    vi.mocked(client.octokit.pulls.update).mockResolvedValueOnce({ data: {} });
    const out = await closePr(client, 9);
    expect(client.octokit.pulls.update).toHaveBeenCalledWith(expect.objectContaining({ state: "closed" }));
    expect(out.closed).toBe(true);
  });

  it("getHistory returns merged kontex prs sorted desc", async () => {
    const client = mockClient();
    vi.mocked(client.octokit.pulls.list).mockResolvedValueOnce({
      data: [
        { number: 1, head: { ref: "kontex/2" }, body: "b2", merged_at: "2026-04-02T00:00:00Z", merge_commit_sha: "s2" },
        { number: 2, head: { ref: "kontex/1" }, body: "b1", merged_at: "2026-04-01T00:00:00Z", merge_commit_sha: "s1" },
        { number: 3, head: { ref: "feature/x" }, body: "", merged_at: "2026-04-03T00:00:00Z", merge_commit_sha: "s3" }
      ]
    });
    const out = await getHistory(client);
    expect(out.map((x) => x.pr_number)).toEqual([1, 2]);
  });
});
