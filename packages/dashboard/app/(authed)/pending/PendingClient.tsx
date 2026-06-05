"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../../components/Icon";
import { mcpClient } from "../../../lib/mcp-client";
import type { ProjectSummary } from "../../../lib/access";
import type { ListProposalsResult, GetEntryResult } from "@kontex/shared";

type Props = {
  projects: ProjectSummary[];
  initialProjectId: string;
};

type ProposalRow = ListProposalsResult["proposals"][number];

export function PendingClient({ projects, initialProjectId }: Props) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [originalEntry, setOriginalEntry] = useState<GetEntryResult | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpClient.listProposals({ project_id: projectId });
      const pendingProposals = result.proposals.filter((p) => p.status === "pending");
      setProposals(pendingProposals);
      if (pendingProposals.length > 0 && !pendingProposals.find((p) => p.proposal_id === selectedId)) {
        setSelectedId(pendingProposals[0].proposal_id);
      } else if (pendingProposals.length === 0) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending proposals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const selected = useMemo(() => proposals.find((p) => p.proposal_id === selectedId) ?? null, [proposals, selectedId]);
  const selectedChange = selected?.changes[0];

  useEffect(() => {
    setOriginalEntry(null);
    if (!selectedChange || !selectedChange.entry_id) return;
    let cancelled = false;
    (async () => {
      try {
        const entry = await mcpClient.getEntry({
          project_id: projectId,
          entry_id: selectedChange.entry_id!
        });
        if (!cancelled) setOriginalEntry(entry);
      } catch {
        if (!cancelled) setOriginalEntry(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedChange, projectId]);

  const resolve = async (decision: "approve" | "reject") => {
    if (!selected) return;
    const reason = decision === "reject" ? window.prompt("Reason for rejection?") ?? "" : undefined;
    setBusy(selected.proposal_id);
    try {
      if (decision === "approve") {
        await mcpClient.approveChange({
          project_id: projectId,
          proposal_id: selected.proposal_id,
          reason
        });
      } else {
        await mcpClient.rejectChange({
          project_id: projectId,
          proposal_id: selected.proposal_id,
          reason
        });
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve proposal");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end border-b border-outline-variant pb-stack-sm">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Pending changes</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Approve or reject proposals submitted from any LLM in spaces you can edit.
          </p>
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md rounded-DEFAULT px-3 py-2 focus:outline-none focus:border-primary"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </header>

      {error ? (
        <div className="font-body-md text-body-md text-error border border-error/40 bg-error-container/10 rounded-DEFAULT px-3 py-2">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <aside className="lg:col-span-4 bg-surface border border-outline-variant rounded-DEFAULT flex flex-col">
          <header className="px-stack-md py-stack-sm border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">Queue</h2>
            <span className="font-mono text-mono-sm text-on-surface-variant">{proposals.length}</span>
          </header>
          {loading && proposals.length === 0 ? (
            <p className="px-stack-md py-stack-md font-body-md text-body-md text-on-surface-variant">Loading…</p>
          ) : proposals.length === 0 ? (
            <p className="px-stack-md py-stack-md font-body-md text-body-md text-on-surface-variant">
              Nothing pending in spaces you can edit.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {proposals.map((p) => {
                const active = p.proposal_id === selectedId;
                const c = p.changes[0];
                return (
                  <li key={p.proposal_id}>
                    <button
                      onClick={() => setSelectedId(p.proposal_id)}
                      className={`w-full text-left px-stack-md py-stack-sm transition-colors flex flex-col gap-1 ${
                        active
                          ? "bg-surface-container-high border-l-2 border-primary"
                          : "hover:bg-surface-container-low border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                          <TypeChip type={c?.type ?? "edit"} />
                          {c?.proposed_title ?? "(untitled)"}
                        </span>
                        <span className="font-mono text-mono-sm text-on-surface-variant">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {c?.proposed_content ? (
                        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                          {c.proposed_content}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="lg:col-span-8 flex flex-col gap-stack-md">
          {!selected ? (
            <div className="bg-surface border border-outline-variant rounded-DEFAULT p-stack-md">
              <p className="font-body-md text-body-md text-on-surface-variant">Select a change to review.</p>
            </div>
          ) : (
            <>
              <div className="bg-surface border border-outline-variant rounded-DEFAULT">
                <header className="px-stack-md py-stack-sm border-b border-outline-variant bg-surface-container-lowest rounded-t-DEFAULT flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TypeChip type={selectedChange?.type ?? "edit"} />
                    <span className="font-mono text-mono-sm text-on-surface-variant">
                      {selected.proposal_id.slice(0, 8)}
                    </span>
                    <span className="font-mono text-mono-sm text-on-surface-variant">
                      · space {selected.space_id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {selectedChange?.type === "new"
                      ? "Proposed new entry"
                      : selectedChange?.type === "edit"
                      ? "Proposed edit"
                      : "Proposed archive"}
                  </span>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-outline-variant">
                  <div className="p-stack-md">
                    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-stack-sm">
                      {selectedChange?.type === "new" ? "(no prior version)" : "Current"}
                    </div>
                    {selectedChange?.type === "new" ? (
                      <p className="font-body-md text-body-md text-on-surface-variant italic">
                        New entry — there is nothing to compare against.
                      </p>
                    ) : originalEntry ? (
                      <div className="flex flex-col gap-2">
                        {originalEntry.title ? (
                          <h3 className="font-headline-md text-headline-md text-on-surface">{originalEntry.title}</h3>
                        ) : null}
                        <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line">
                          {originalEntry.content}
                        </p>
                      </div>
                    ) : (
                      <p className="font-body-md text-body-md text-on-surface-variant">Loading current content…</p>
                    )}
                  </div>
                  <div className="p-stack-md">
                    <div className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-stack-sm">
                      {selectedChange?.type === "archive" ? "Archive" : "Proposed"}
                    </div>
                    {selectedChange?.type === "archive" ? (
                      <p className="font-body-md text-body-md text-on-surface-variant italic">
                        Approving will mark this entry as archived. The content remains in the database for history but
                        is no longer returned by query_context or list_recent.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selectedChange?.proposed_title ? (
                          <h3 className="font-headline-md text-headline-md text-on-surface">{selectedChange.proposed_title}</h3>
                        ) : null}
                        <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">
                          {selectedChange?.proposed_content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-outline-variant rounded-DEFAULT p-stack-md flex flex-col gap-stack-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface">Governance</h3>
                <button
                  disabled={busy === selected.proposal_id}
                  onClick={() => resolve("approve")}
                  className="w-full flex justify-center items-center gap-2 py-2.5 bg-on-surface text-surface rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors disabled:opacity-50"
                >
                  <Icon name="check_circle" className="text-[18px]" filled /> Approve
                </button>
                <button
                  disabled={busy === selected.proposal_id}
                  onClick={() => resolve("reject")}
                  className="w-full flex justify-center items-center gap-2 py-2 border border-error bg-transparent text-error rounded-DEFAULT font-label-md text-label-md hover:bg-error/10 transition-colors disabled:opacity-50"
                >
                  <Icon name="cancel" className="text-[18px]" /> Reject
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function TypeChip({ type }: { type: "new" | "edit" | "archive" }) {
  const styles =
    type === "new"
      ? "bg-primary-container/20 border-primary/40 text-primary"
      : type === "edit"
      ? "bg-secondary-container/20 border-secondary/40 text-secondary"
      : "bg-error-container/20 border-error/40 text-error";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-DEFAULT border font-label-sm text-label-sm ${styles}`}
    >
      <Icon
        name={type === "new" ? "add" : type === "edit" ? "edit" : "archive"}
        className="text-[12px]"
        filled
      />
      {type}
    </span>
  );
}
