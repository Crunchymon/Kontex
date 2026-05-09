import type {
  GetEntryInput,
  GetEntryResult,
  ListPendingInput,
  ListPendingResult,
  ListRecentInput,
  ListRecentResult,
  ProposeArchiveInput,
  ProposeArchiveResult,
  ProposeEditInput,
  ProposeEditResult,
  ProposeEntryInput,
  ProposeEntryResult,
  QueryContextInput,
  QueryContextResult,
  ResolveChangeInput,
  ResolveChangeResult,
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
  listRecent: (input: ListRecentInput): Promise<ListRecentResult> => call("list_recent", input),
  listPending: (input: ListPendingInput): Promise<ListPendingResult> => call("list_pending", input),
  proposeEntry: (input: ProposeEntryInput): Promise<ProposeEntryResult> =>
    call("propose_entry", input),
  proposeEdit: (input: ProposeEditInput): Promise<ProposeEditResult> => call("propose_edit", input),
  proposeArchive: (input: ProposeArchiveInput): Promise<ProposeArchiveResult> =>
    call("propose_archive", input),
  resolveChange: (input: ResolveChangeInput): Promise<ResolveChangeResult> =>
    call("resolve_change", input)
};
