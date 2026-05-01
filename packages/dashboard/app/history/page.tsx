"use client";

import { useEffect, useState } from "react";
import type { HistoryEntry } from "../../../shared/src";
import Link from "next/link";
import { mcpClient } from "../../lib/mcp-client";
import { ActionButtons } from "../../components/ActionButtons";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mcpClient.getHistory().then(setEntries).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load history");
    });
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      {error ? <p className="text-red-700">{error}</p> : null}
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li className="rounded border bg-white p-4" key={entry.sha}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">
                  #{entry.pr_number} - {new Date(entry.merged_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-700">{entry.description}</p>
                <Link className="text-sm text-blue-700 hover:underline" href={`/history/${entry.sha}`}>
                  View Snapshot
                </Link>
              </div>
              <ActionButtons kind="rollback" sha={entry.sha} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
