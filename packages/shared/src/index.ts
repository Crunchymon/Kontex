export type ContextFile = {
  content: string;
  sha: string;
};

export type RaisePrInput = {
  proposed_content: string;
  description: string;
};

export type RaisePrResult = {
  pr_number: number;
  pr_url: string;
  branch_name: string;
};

export type OpenPr = {
  pr_number: number;
  title: string;
  description: string;
  base_content: string;
  head_content: string;
  created_at: string;
};

export type HistoryEntry = {
  pr_number: number;
  description: string;
  merged_at: string;
  sha: string;
};

export type ToolName =
  | "read_context"
  | "raise_pr"
  | "list_prs"
  | "merge_pr"
  | "close_pr"
  | "get_history";

export type ToolInputMap = {
  read_context: { sha?: string };
  raise_pr: RaisePrInput;
  list_prs: Record<string, never>;
  merge_pr: { pr_number: number };
  close_pr: { pr_number: number };
  get_history: Record<string, never>;
};

export type ToolOutputMap = {
  read_context: ContextFile;
  raise_pr: RaisePrResult;
  list_prs: OpenPr[];
  merge_pr: { merged: true; sha: string };
  close_pr: { closed: true };
  get_history: HistoryEntry[];
};

export type ToolInput<T extends ToolName> = ToolInputMap[T];
export type ToolOutput<T extends ToolName> = ToolOutputMap[T];
