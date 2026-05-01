"use client";

import { useEffect, useState } from "react";
import { ContextView } from "../components/ContextView";
import { mcpClient } from "../lib/mcp-client";

export default function CurrentContextPage() {
  const [content, setContent] = useState("Loading...");

  useEffect(() => {
    mcpClient.readContext().then((data) => setContent(data.content)).catch((e: unknown) => {
      setContent(`Error loading context: ${e instanceof Error ? e.message : "unknown"}`);
    });
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Current Context</h1>
      <ContextView content={content} />
    </section>
  );
}
