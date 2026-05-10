import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../src/db.js";
import type { AuthContext } from "../src/auth.js";
import type { EmbeddingClient } from "../src/embeddings.js";
import { handleProposeEntry } from "../src/tools/proposeEntry.js";
import { KontexError } from "../src/errors.js";
import { MAX_ENTRY_CHARS } from "@kontex/shared";

const mocks = vi.hoisted(() => ({
  requireProjectMember: vi.fn(),
  requireSpaceEditor: vi.fn(),
  applyApproval: vi.fn()
}));

vi.mock("../src/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/auth.js")>();
  return {
    ...actual,
    requireProjectMember: mocks.requireProjectMember,
    requireSpaceEditor: mocks.requireSpaceEditor
  };
});

vi.mock("../src/tools/_apply.js", () => ({
  applyApproval: mocks.applyApproval
}));

const ctx: AuthContext = {
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "u@example.com",
    name: "U",
    createdAt: new Date()
  },
  apiKey: {
    id: "00000000-0000-0000-0000-000000000010",
    keyHash: "h",
    userId: "00000000-0000-0000-0000-000000000001",
    name: "test",
    source: "user_generated",
    createdAt: new Date(),
    revokedAt: null,
    lastUsedAt: null
  }
};

function dbReturning(id: string): Database {
  const inserted = {
    id,
    projectId: "00000000-0000-0000-0000-000000000100",
    spaceId: "00000000-0000-0000-0000-000000000200",
    type: "new",
    status: "pending",
    proposedContent: "hello",
    proposedBy: ctx.user.id,
    rationale: "test",
    proposedTitle: null,
    entryId: null
  };
  const select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([inserted])
      })
    })
  });
  const insert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id }])
    })
  });
  return { insert, select } as unknown as Database;
}

const embeddings: EmbeddingClient = {
  embed: vi.fn().mockResolvedValue(new Array(768).fill(0.1))
};

describe("handleProposeEntry", () => {
  beforeEach(() => {
    mocks.requireProjectMember.mockReset().mockResolvedValue({ projectRole: "member" });
    mocks.requireSpaceEditor.mockReset().mockResolvedValue({ spaceRole: "editor" });
    mocks.applyApproval.mockReset().mockResolvedValue({ entryId: "entry-1" });
  });

  it("rejects content over the 1500-char hard cap before touching the database", async () => {
    const db = dbReturning("change-1");
    const oversize = "x".repeat(MAX_ENTRY_CHARS + 1);
    await expect(
      handleProposeEntry(db, embeddings, ctx, {
        project_id: "00000000-0000-0000-0000-000000000100",
        space_id: "00000000-0000-0000-0000-000000000200",
        content: oversize,
        rationale: "test"
      })
    ).rejects.toBeInstanceOf(KontexError);
    expect(mocks.requireProjectMember).not.toHaveBeenCalled();
  });

  it("auto-resolves new change for editor callers", async () => {
    const db = dbReturning("change-1");
    const result = await handleProposeEntry(db, embeddings, ctx, {
      project_id: "00000000-0000-0000-0000-000000000100",
      space_id: "00000000-0000-0000-0000-000000000200",
      title: "T",
      content: "hello",
      rationale: "logging"
    });
    expect(result).toEqual({
      status: "resolved",
      resolved: true,
      decision: "approve",
      entry_id: "entry-1"
    });
    expect(mocks.requireProjectMember).toHaveBeenCalledOnce();
    expect(mocks.requireSpaceEditor).toHaveBeenCalledOnce();
    expect(mocks.applyApproval).toHaveBeenCalledOnce();
  });

  it("rejects callers without editor role on the target space", async () => {
    mocks.requireSpaceEditor.mockRejectedValueOnce(
      new KontexError("insufficient_role", "must be editor")
    );
    const db = dbReturning("never");
    await expect(
      handleProposeEntry(db, embeddings, ctx, {
        project_id: "00000000-0000-0000-0000-000000000100",
        space_id: "00000000-0000-0000-0000-000000000200",
        content: "hi",
        rationale: "r"
      })
    ).rejects.toBeInstanceOf(KontexError);
  });
});
