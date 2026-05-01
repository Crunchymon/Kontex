import { Buffer } from "node:buffer";
import { Octokit } from "@octokit/rest";
import { type Env } from "./env.js";

export type GitHubClient = {
  octokit: Octokit;
  owner: string;
  repo: string;
  contextPath: string;
};

export function createGitHubClient(env: Env): GitHubClient {
  return {
    octokit: new Octokit({ auth: env.GITHUB_PAT }),
    owner: env.REPO_OWNER,
    repo: env.REPO_NAME,
    contextPath: env.CONTEXT_PATH
  };
}

function decodeContent(content: string): string {
  return Buffer.from(content, "base64").toString("utf8");
}

export async function getContext(client: GitHubClient, ref = "main"): Promise<{ content: string; sha: string }> {
  const res = await client.octokit.repos.getContent({
    owner: client.owner,
    repo: client.repo,
    path: client.contextPath,
    ref
  });

  if (Array.isArray(res.data) || !("content" in res.data)) {
    throw new Error("Expected file content but received directory listing");
  }

  return {
    content: decodeContent(res.data.content),
    sha: res.data.sha
  };
}

export async function raisePr(
  client: GitHubClient,
  proposedContent: string,
  description: string
): Promise<{ pr_number: number; pr_url: string; branch_name: string }> {
  const branchName = `kontex/${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const baseBranch = "main";

  const baseRef = await client.octokit.git.getRef({
    owner: client.owner,
    repo: client.repo,
    ref: `heads/${baseBranch}`
  });

  await client.octokit.git.createRef({
    owner: client.owner,
    repo: client.repo,
    ref: `refs/heads/${branchName}`,
    sha: baseRef.data.object.sha
  });

  const existing = await getContext(client, baseBranch);

  await client.octokit.repos.createOrUpdateFileContents({
    owner: client.owner,
    repo: client.repo,
    path: client.contextPath,
    message: `kontex: ${description.split("\n")[0] || "update context"}`,
    content: Buffer.from(proposedContent, "utf8").toString("base64"),
    branch: branchName,
    sha: existing.sha
  });

  const pr = await client.octokit.pulls.create({
    owner: client.owner,
    repo: client.repo,
    title: (description.split("\n")[0] || "Update context").slice(0, 72),
    body: description,
    head: branchName,
    base: baseBranch
  });

  return {
    pr_number: pr.data.number,
    pr_url: pr.data.html_url,
    branch_name: branchName
  };
}

export async function listPrs(client: GitHubClient) {
  const prs = await client.octokit.pulls.list({
    owner: client.owner,
    repo: client.repo,
    state: "open",
    per_page: 100
  });

  const kontexPrs = prs.data.filter((pr) => pr.head.ref.startsWith("kontex/"));
  return Promise.all(
    kontexPrs.map(async (pr) => {
      const base = await getContext(client, pr.base.sha);
      const head = await getContext(client, pr.head.sha);
      return {
        pr_number: pr.number,
        title: pr.title,
        description: pr.body ?? "",
        base_content: base.content,
        head_content: head.content,
        created_at: pr.created_at
      };
    })
  );
}

export async function mergePr(client: GitHubClient, prNumber: number) {
  const res = await client.octokit.pulls.merge({
    owner: client.owner,
    repo: client.repo,
    pull_number: prNumber,
    merge_method: "squash"
  });
  return {
    merged: true as const,
    sha: res.data.sha
  };
}

export async function closePr(client: GitHubClient, prNumber: number) {
  await client.octokit.pulls.update({
    owner: client.owner,
    repo: client.repo,
    pull_number: prNumber,
    state: "closed"
  });
  return { closed: true as const };
}

export async function getHistory(client: GitHubClient) {
  const prs = await client.octokit.pulls.list({
    owner: client.owner,
    repo: client.repo,
    state: "closed",
    per_page: 100
  });

  return prs.data
    .filter((pr) => pr.merged_at && pr.head.ref.startsWith("kontex/"))
    .sort((a, b) => (a.merged_at! < b.merged_at! ? 1 : -1))
    .map((pr) => ({
      pr_number: pr.number,
      description: pr.body ?? "",
      merged_at: pr.merged_at!,
      sha: pr.merge_commit_sha ?? ""
    }));
}
