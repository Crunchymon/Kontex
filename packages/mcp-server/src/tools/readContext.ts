import { z } from "zod";
import { getContext, type GitHubClient } from "../github.js";

export const readContextTool = {
  name: "read_context",
  description: "Read context.txt from main or specific sha",
  inputSchema: z.object({
    sha: z.string().optional()
  }),
  async handler(client: GitHubClient, input: { sha?: string }) {
    return getContext(client, input.sha ?? "main");
  }
};
