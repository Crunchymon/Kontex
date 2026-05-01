import { z } from "zod";
import { closePr, type GitHubClient } from "../github.js";

export const closePrTool = {
  name: "close_pr",
  description: "Close a Kontex PR without merging",
  inputSchema: z.object({
    pr_number: z.number().int().positive()
  }),
  async handler(client: GitHubClient, input: { pr_number: number }) {
    return closePr(client, input.pr_number);
  }
};
