import { z } from "zod";
import { raisePr, type GitHubClient } from "../github.js";

export const raisePrTool = {
  name: "raise_pr",
  description: "Raise a GitHub PR proposing a new context file",
  inputSchema: z.object({
    proposed_content: z.string(),
    description: z.string().min(1)
  }),
  async handler(client: GitHubClient, input: { proposed_content: string; description: string }) {
    return raisePr(client, input.proposed_content, input.description);
  }
};
