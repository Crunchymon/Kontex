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

export const listProjectsInput = z.object({});

export const listSpacesInput = z.object({
  project_id: uuid()
});

export const listMembersInput = z.object({
  project_id: uuid()
});

export const createProjectInput = z.object({
  name: z.string().min(1).max(200)
});

export const createSpaceInput = z.object({
  project_id: uuid(),
  name: z.string().min(1).max(200)
});

export const inviteMemberInput = z.object({
  project_id: uuid(),
  email: z.string().email(),
  project_role: z.enum(["admin", "member"]).default("member"),
  space_id: uuid(),
  space_role: z.enum(["editor", "reader"]).default("editor")
});

export const setProjectRoleInput = z.object({
  project_id: uuid(),
  user_id: uuid(),
  role: z.enum(["admin", "member", "remove"])
});

export const setSpaceRoleInput = z.object({
  project_id: uuid(),
  space_id: uuid(),
  user_id: uuid(),
  role: z.enum(["editor", "reader", "none"])
});

export type QueryContextInput = z.infer<typeof queryContextInput>;
export type GetEntryInput = z.infer<typeof getEntryInput>;
export type ListRecentInput = z.infer<typeof listRecentInput>;
export type ListPendingInput = z.infer<typeof listPendingInput>;
export type ProposeEntryInput = z.infer<typeof proposeEntryInput>;
export type ProposeEditInput = z.infer<typeof proposeEditInput>;
export type ProposeArchiveInput = z.infer<typeof proposeArchiveInput>;
export type ResolveChangeInput = z.infer<typeof resolveChangeInput>;
export type ListProjectsInput = z.infer<typeof listProjectsInput>;
export type ListSpacesInput = z.infer<typeof listSpacesInput>;
export type ListMembersInput = z.infer<typeof listMembersInput>;
export type CreateProjectInput = z.infer<typeof createProjectInput>;
export type CreateSpaceInput = z.infer<typeof createSpaceInput>;
export type InviteMemberInput = z.input<typeof inviteMemberInput>;
export type SetProjectRoleInput = z.infer<typeof setProjectRoleInput>;
export type SetSpaceRoleInput = z.infer<typeof setSpaceRoleInput>;

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

export type ProposeEntryResult =
  | {
      change_id: string;
      status: "pending";
    }
  | {
      status: "resolved";
      resolved: true;
      decision: "approve";
      entry_id: string | null;
    };

export type ProposeEditResult =
  | {
      change_id: string;
      status: "pending";
      entry_title: string | null;
      summary: string;
    }
  | {
      status: "resolved";
      resolved: true;
      decision: "approve";
      entry_id: string | null;
      entry_title: string | null;
      summary: string;
    };

export type ProposeArchiveResult =
  | {
      change_id: string;
      status: "pending";
      entry_title: string | null;
      summary: string;
    }
  | {
      status: "resolved";
      resolved: true;
      decision: "approve";
      entry_id: string | null;
      entry_title: string | null;
      summary: string;
    };

export type ResolveChangeResult = {
  resolved: true;
  decision: "approve" | "reject";
  entry_id: string | null;
};

export type ListProjectsResult = {
  projects: Array<{
    project_id: string;
    name: string;
    project_role: "admin" | "member";
    created_at: string;
  }>;
};

export type ListSpacesResult = {
  spaces: Array<{
    space_id: string;
    name: string;
    space_role: "editor" | "reader" | null;
  }>;
};

export type ListMembersResult = {
  members: Array<{
    user_id: string;
    email: string;
    name: string;
    project_role: "admin" | "member";
    space_roles: Record<string, "editor" | "reader">;
  }>;
};

export type CreateProjectResult = {
  project_id: string;
  name: string;
};

export type CreateSpaceResult = {
  space_id: string;
  project_id: string;
  name: string;
};

export type InviteMemberResult = {
  status: "added" | "queued";
  message: string;
};

export type SetProjectRoleResult = {
  updated: true;
  role: "admin" | "member" | "remove";
};

export type SetSpaceRoleResult = {
  updated: true;
  role: "editor" | "reader" | "none";
};

export type ToolName =
  | "list_projects"
  | "list_spaces"
  | "list_members"
  | "create_project"
  | "create_space"
  | "invite_member"
  | "set_project_role"
  | "set_space_role"
  | "query_context"
  | "get_entry"
  | "list_recent"
  | "list_pending"
  | "propose_entry"
  | "propose_edit"
  | "propose_archive"
  | "resolve_change";

export type ToolInputMap = {
  list_projects: ListProjectsInput;
  list_spaces: ListSpacesInput;
  list_members: ListMembersInput;
  create_project: CreateProjectInput;
  create_space: CreateSpaceInput;
  invite_member: InviteMemberInput;
  set_project_role: SetProjectRoleInput;
  set_space_role: SetSpaceRoleInput;
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
  list_projects: ListProjectsResult;
  list_spaces: ListSpacesResult;
  list_members: ListMembersResult;
  create_project: CreateProjectResult;
  create_space: CreateSpaceResult;
  invite_member: InviteMemberResult;
  set_project_role: SetProjectRoleResult;
  set_space_role: SetSpaceRoleResult;
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
