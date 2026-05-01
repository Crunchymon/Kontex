"use client";

import { useState } from "react";
import { mcpClient } from "../lib/mcp-client";

type Props =
  | { kind: "pr"; prNumber: number }
  | { kind: "rollback"; sha: string };

export function ActionButtons(props: Props) {
  const [busy, setBusy] = useState(false);

  async function handleMerge() {
    if (props.kind !== "pr") return;
    setBusy(true);
    try {
      await mcpClient.mergePr({ pr_number: props.prNumber });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    if (props.kind !== "pr") return;
    setBusy(true);
    try {
      await mcpClient.closePr({ pr_number: props.prNumber });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleRollback() {
    if (props.kind !== "rollback") return;
    setBusy(true);
    try {
      await mcpClient.rollbackTo(props.sha);
      window.location.assign("/prs");
    } finally {
      setBusy(false);
    }
  }

  if (props.kind === "rollback") {
    return (
      <button
        type="button"
        className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
        disabled={busy}
        onClick={handleRollback}
      >
        Rollback
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="rounded bg-green-700 px-3 py-2 text-white disabled:opacity-60"
        disabled={busy}
        onClick={handleMerge}
      >
        Merge
      </button>
      <button
        type="button"
        className="rounded bg-gray-700 px-3 py-2 text-white disabled:opacity-60"
        disabled={busy}
        onClick={handleClose}
      >
        Close
      </button>
    </div>
  );
}
