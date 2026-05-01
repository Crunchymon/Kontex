"use client";

import { useEffect, useState } from "react";
import type { OpenPr } from "../../../shared/src";
import { mcpClient } from "../../lib/mcp-client";
import { DiffView } from "../../components/DiffView";
import { ActionButtons } from "../../components/ActionButtons";

export default function OpenPrsPage() {
  const [prs, setPrs] = useState<OpenPr[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mcpClient.listPrs().then(setPrs).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load PRs");
    });
  }, []);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Open PRs</h1>
      {error ? <p className="text-red-700">{error}</p> : null}
      {prs.map((pr) => (
        <article className="space-y-3 rounded border p-4" key={pr.pr_number}>
          <h2 className="text-lg font-semibold">
            #{pr.pr_number} - {pr.title}
          </h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{pr.description}</p>
          <DiffView base={pr.base_content} head={pr.head_content} />
          <ActionButtons kind="pr" prNumber={pr.pr_number} />
        </article>
      ))}
      {prs.length === 0 && !error ? <p>No open Kontex PRs.</p> : null}
    </section>
  );
}
