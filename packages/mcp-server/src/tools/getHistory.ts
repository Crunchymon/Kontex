import { z } from "zod";
import { getHistory, type GitHubClient } from "../github.js";

export const getHistoryTool = {
  name: "get_history",
  description: "List merged Kontex PR history entries",
  inputSchema: z.object({}),
  async handler(client: GitHubClient) {
    return getHistory(client);
  }
};
