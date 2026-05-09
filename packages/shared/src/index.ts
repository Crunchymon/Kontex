import { z } from "zod";
import { MAX_ENTRY_CHARS, EMBEDDING_DIMENSIONS } from "./schema/index.js";

export { MAX_ENTRY_CHARS, EMBEDDING_DIMENSIONS };
export * from "./schema/index.js";

export const TOO_LONG_ERROR = (submitted: number) => ({
  error: "Entry too long. Break this into smaller entries — one concept per entry.",
  max_length: MAX_ENTRY_CHARS,
  submitted_length: submitted
});

const uuid = () => z.string().uuid();
const boundedContent = z
  .string()
  .min(1, "Content cannot be empty")
  .max(MAX_ENTRY_CHARS, `Content exceeds ${MAX_ENTRY_CHARS} characters`);

export const queryContextInput = z.object({
  project_id: uuid(),
  space_id: uuid().optional(),
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).optional()
});

export const getEntryInput = z.object({
  project_id: uuid(),
  entry_id: uuid()
});

export const listRecentInput = z.object({
  project_id: uuid(),
  space_id: uuid(),
  limit: z.number().int().positive().max(100).optional()
});

export const listPendingInput = z.object({
  project_id: uuid()
});

export const proposeEntryInput = z.object({
  project_id: uuid(),
  space_id: uuid(),
  title: z.string().max(200).optional(),
  content: boundedContent,
  rationale: z.string().min(1)
});

export const proposeEditInput = z.object({
  project_id: uuid(),
  entry_id: uuid(),
  new_content: boundedContent,
  new_title: z.string().max(200).optional(),
  rationale: z.string().min(1)
});

export const proposeArchiveInput = z.object({
  project_id: uuid(),
  entry_id: uuid(),
  rationale: z.string().min(1)
});

export const resolveChangeInput = z.object({
  project_id: uuid(),
  change_id: uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().optional()
});

export type QueryContextInput = z.infer<typeof queryContextInput>;
export type GetEntryInput = z.infer<typeof getEntryInput>;
export type ListRecentInput = z.infer<typeof listRecentInput>;
export type ListPendingInput = z.infer<typeof listPendingInput>;
export type ProposeEntryInput = z.infer<typeof proposeEntryInput>;
export type ProposeEditInput = z.infer<typeof proposeEditInput>;
export type ProposeArchiveInput = z.infer<typeof proposeArchiveInput>;
export type ResolveChangeInput = z.infer<typeof resolveChangeInput>;

export type QueryContextResult = {
  results: Array<{
    entry_id: string;
    title: string | null;
    content: string;
    space_id: string;
    similarity_score: number;
    created_at: string;
  }>;
};

export type EntryDetail = {
  entry_id: string;
  project_id: string;
  space_id: string;
  title: string | null;
  content: string;
  status: "active" | "archived";
  created_by: string;
  created_at: string;
  versions: Array<{
    version_id: string;
    content: string;
    title: string | null;
    changed_by: string;
    changed_at: string;
    rationale: string;
    version: number;
  }>;
};

export type GetEntryResult = EntryDetail;

export type ListRecentResult = {
  entries: Array<{
    entry_id: string;
    title: string | null;
    content: string;
    space_id: string;
    created_by: string;
    created_at: string;
  }>;
};

export type ListPendingResult = {
  changes: Array<{
    change_id: string;
    type: "new" | "edit" | "archive";
    space_id: string;
    entry_id: string | null;
    proposed_title: string | null;
    proposed_content: string | null;
    rationale: string;
    proposed_by: string;
    created_at: string;
  }>;
};

export type ProposeEntryResult = {
  change_id: string;
  status: "pending";
};

export type ProposeEditResult = {
  change_id: string;
  status: "pending";
  entry_title: string | null;
  summary: string;
};

export type ProposeArchiveResult = {
  change_id: string;
  status: "pending";
  entry_title: string | null;
  summary: string;
};

export type ResolveChangeResult = {
  resolved: true;
  decision: "approve" | "reject";
  entry_id: string | null;
};

export type ToolName =
  | "query_context"
  | "get_entry"
  | "list_recent"
  | "list_pending"
  | "propose_entry"
  | "propose_edit"
  | "propose_archive"
  | "resolve_change";

export type ToolInputMap = {
  query_context: QueryContextInput;
  get_entry: GetEntryInput;
  list_recent: ListRecentInput;
  list_pending: ListPendingInput;
  propose_entry: ProposeEntryInput;
  propose_edit: ProposeEditInput;
  propose_archive: ProposeArchiveInput;
  resolve_change: ResolveChangeInput;
};

export type ToolOutputMap = {
  query_context: QueryContextResult;
  get_entry: GetEntryResult;
  list_recent: ListRecentResult;
  list_pending: ListPendingResult;
  propose_entry: ProposeEntryResult;
  propose_edit: ProposeEditResult;
  propose_archive: ProposeArchiveResult;
  resolve_change: ResolveChangeResult;
};

export type ToolInput<T extends ToolName> = ToolInputMap[T];
export type ToolOutput<T extends ToolName> = ToolOutputMap[T];
