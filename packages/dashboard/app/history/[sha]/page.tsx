"use client";

import { useEffect, useState } from "react";
import { ContextView } from "../../../components/ContextView";
import { mcpClient } from "../../../lib/mcp-client";

export default function HistorySnapshotPage({ params }: { params: { sha: string } }) {
  const [content, setContent] = useState("Loading...");

  useEffect(() => {
    mcpClient.readContext({ sha: params.sha }).then((data) => setContent(data.content)).catch((e: unknown) => {
      setContent(`Error loading snapshot: ${e instanceof Error ? e.message : "unknown"}`);
    });
  }, [params.sha]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Snapshot {params.sha.slice(0, 8)}</h1>
      <ContextView content={content} />
    </section>
  );
}
