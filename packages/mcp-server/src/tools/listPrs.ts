import { z } from "zod";
import { listPrs, type GitHubClient } from "../github.js";

export const listPrsTool = {
  name: "list_prs",
  description: "List open Kontex PRs including base/head context content",
  inputSchema: z.object({}),
  async handler(client: GitHubClient) {
    return listPrs(client);
  }
};
