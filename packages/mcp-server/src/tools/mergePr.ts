import { z } from "zod";
import { mergePr, type GitHubClient } from "../github.js";

export const mergePrTool = {
  name: "merge_pr",
  description: "Merge a Kontex PR with squash strategy",
  inputSchema: z.object({
    pr_number: z.number().int().positive()
  }),
  async handler(client: GitHubClient, input: { pr_number: number }) {
    return mergePr(client, input.pr_number);
  }
};
