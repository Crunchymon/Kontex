"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../components/Icon";
import { mcpClient } from "../../../lib/mcp-client";
import type { ProjectSummary } from "../../../lib/access";
import type { QueryContextResult } from "@kontex/shared";

type Props = {
  projects: ProjectSummary[];
  initialProjectId: string;
};

const RECENT_LIMIT = 5;

export function BrowseClient({ projects, initialProjectId }: Props) {
  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<QueryContextResult["results"]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await mcpClient.queryContext({ project_id: projectId, query: query.trim() });
        setResults(result.results);
        setRecent((prev) => {
          const next = [query.trim(), ...prev.filter((q) => q !== query.trim())].slice(0, RECENT_LIMIT);
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, projectId]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end border-b border-outline-variant pb-stack-sm">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Context</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Semantic search over the spaces in {project?.name ?? "this project"} that you have access to.
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

      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon name="manage_search" className="text-outline text-[24px]" />
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query institutional memory, e.g. 'eigenvalues lecture'..."
          className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body-lg text-body-lg rounded-xl py-4 pl-12 pr-24 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-outline-variant"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          <kbd className="font-mono text-mono-sm text-outline-variant bg-surface-container-high px-2 py-1 rounded-DEFAULT border border-outline-variant">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-gutter">
        <section className="flex-1 flex flex-col gap-stack-md">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
            <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
              {loading ? "Searching…" : `Semantic results (${results.length})`}
            </h2>
            <span className="font-label-sm text-label-sm text-outline">Sorted by similarity</span>
          </div>
          {error ? (
            <div className="font-body-md text-body-md text-error border border-error/40 bg-error-container/10 rounded-DEFAULT px-3 py-2">
              {error}
            </div>
          ) : null}
          {!loading && results.length === 0 && query.trim() ? (
            <div className="font-body-md text-body-md text-on-surface-variant border border-outline-variant rounded-DEFAULT px-stack-md py-stack-md bg-surface">
              No matching entries.
            </div>
          ) : null}
          {results.map((r) => (
            <article
              key={r.entry_id}
              className="bg-surface border border-outline-variant rounded-lg p-4 flex flex-col gap-3 hover:bg-surface-container-low transition-colors group"
            >
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-mono-sm text-primary-fixed-dim bg-surface-container-lowest px-2 py-0.5 rounded-DEFAULT border border-outline-variant">
                    {r.entry_id.slice(0, 8)}
                  </span>
                  <span className="px-2 py-0.5 rounded-DEFAULT font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant border border-outline-variant">
                    space {r.space_id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-secondary">
                  <Icon name="radar" className="text-[16px]" />
                  <span className="font-mono text-mono-sm font-semibold">
                    {r.similarity_score.toFixed(2)} match
                  </span>
                </div>
              </div>
              {r.title ? (
                <h3 className="font-headline-md text-headline-md text-on-surface">{r.title}</h3>
              ) : null}
              <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line line-clamp-4">
                {r.content}
              </p>
              <div className="flex items-center gap-3 mt-1 pt-3 border-t border-outline-variant text-outline font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <Icon name="calendar_today" className="text-[14px]" />
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
            </article>
          ))}
        </section>

        <aside className="w-full md:w-72 flex flex-col gap-stack-md">
          <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
            <div className="p-3 border-b border-outline-variant bg-surface-container-low flex items-center gap-2">
              <Icon name="history" className="text-[18px] text-outline" />
              <h3 className="font-label-md text-label-md text-on-surface">Recent queries</h3>
            </div>
            {recent.length === 0 ? (
              <p className="px-3 py-3 font-body-md text-body-md text-on-surface-variant">
                No recent queries.
              </p>
            ) : (
              <ul>
                {recent.map((q) => (
                  <li
                    key={q}
                    className="border-t border-outline-variant first:border-t-0 hover:bg-surface-container-high transition-colors"
                  >
                    <button
                      onClick={() => setQuery(q)}
                      className="text-left w-full px-3 py-2 font-body-md text-body-md text-on-surface-variant hover:text-on-surface flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{q}</span>
                      <Icon name="north_west" className="text-[14px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-surface border border-outline-variant rounded-lg p-4">
            <h3 className="font-label-md text-label-md text-on-surface flex items-center gap-2">
              <Icon name="info" className="text-[18px] text-outline" /> How search works
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              The dashboard never queries the database directly. Each query is forwarded to the MCP server using your
              session API key, which means access control is identical to your LLM&apos;s view of the data.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
