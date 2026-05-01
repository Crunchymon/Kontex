import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CurrentContextPage from "../app/page";
import OpenPrsPage from "../app/prs/page";
import HistoryPage from "../app/history/page";

vi.mock("../lib/mcp-client", () => ({
  mcpClient: {
    readContext: vi.fn().mockResolvedValue({ content: "ctx", sha: "s1" }),
    listPrs: vi.fn().mockResolvedValue([
      {
        pr_number: 1,
        title: "Change",
        description: "desc",
        base_content: "old",
        head_content: "new",
        created_at: "2026-01-01T00:00:00Z"
      }
    ]),
    getHistory: vi.fn().mockResolvedValue([
      { pr_number: 2, description: "merged", merged_at: "2026-01-01T00:00:00Z", sha: "abc12345" }
    ])
  }
}));

describe("dashboard pages", () => {
  it("renders context page heading", () => {
    render(<CurrentContextPage />);
    expect(screen.getByText("Current Context")).toBeInTheDocument();
  });

  it("renders PR page heading", () => {
    render(<OpenPrsPage />);
    expect(screen.getByText("Open PRs")).toBeInTheDocument();
  });

  it("renders history page heading", () => {
    render(<HistoryPage />);
    expect(screen.getByText("History")).toBeInTheDocument();
  });
});
