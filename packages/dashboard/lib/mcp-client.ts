import type {
  GetEntryInput,
  GetEntryResult,
  ListProposalsInput,
  ListProposalsResult,
  ListRecentEntriesInput,
  ListRecentEntriesResult,
  ProposeArchiveInput,
  ProposeArchiveResult,
  ProposeEditInput,
  ProposeEditResult,
  ProposeEntryInput,
  ProposeEntryResult,
  QueryContextInput,
  QueryContextResult,
  ApproveChangeInput,
  ApproveChangeResult,
  RejectChangeInput,
  RejectChangeResult,
  ToolName,
  ToolInputMap,
  ToolOutputMap
} from "@kontex/shared";

type Envelope<T> = { ok: true; result: T } | { ok: false; error: { code?: string; message: string; details?: unknown } };

async function call<T extends ToolName>(
  tool: T,
  input: ToolInputMap[T]
): Promise<ToolOutputMap[T]> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, input })
  });
  const body = (await res.json()) as Envelope<ToolOutputMap[T]>;
  if (!body.ok) {
    throw new Error(body.error.message ?? `Tool ${tool} failed`);
  }
  return body.result;
}

export const mcpClient = {
  queryContext: (input: QueryContextInput): Promise<QueryContextResult> =>
    call("query_context", input),
  getEntry: (input: GetEntryInput): Promise<GetEntryResult> => call("get_entry", input),
  listRecentEntries: (input: ListRecentEntriesInput): Promise<ListRecentEntriesResult> => call("list_recent_entries", input),
  listProposals: (input: ListProposalsInput): Promise<ListProposalsResult> => call("list_proposals", input),
  proposeEntry: (input: ProposeEntryInput): Promise<ProposeEntryResult> =>
    call("propose_entry", input),
  proposeEdit: (input: ProposeEditInput): Promise<ProposeEditResult> => call("propose_edit", input),
  proposeArchive: (input: ProposeArchiveInput): Promise<ProposeArchiveResult> =>
    call("propose_archive", input),
  approveChange: (input: ApproveChangeInput): Promise<ApproveChangeResult> =>
    call("approve_change", input),
  rejectChange: (input: RejectChangeInput): Promise<RejectChangeResult> =>
    call("reject_change", input)
};
