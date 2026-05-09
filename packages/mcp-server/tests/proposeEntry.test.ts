import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../src/db.js";
import type { AuthContext } from "../src/auth.js";
import { handleProposeEntry } from "../src/tools/proposeEntry.js";
import { KontexError } from "../src/errors.js";
import { MAX_ENTRY_CHARS } from "@kontex/shared";

const mocks = vi.hoisted(() => ({
  requireProjectMember: vi.fn(),
  requireSpaceEditor: vi.fn()
}));

vi.mock("../src/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/auth.js")>();
  return {
    ...actual,
    requireProjectMember: mocks.requireProjectMember,
    requireSpaceEditor: mocks.requireSpaceEditor
  };
});

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
  const insert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id }])
    })
  });
  return { insert } as unknown as Database;
}

describe("handleProposeEntry", () => {
  beforeEach(() => {
    mocks.requireProjectMember.mockReset().mockResolvedValue({ projectRole: "member" });
    mocks.requireSpaceEditor.mockReset().mockResolvedValue({ spaceRole: "editor" });
  });

  it("rejects content over the 1500-char hard cap before touching the database", async () => {
    const db = dbReturning("change-1");
    const oversize = "x".repeat(MAX_ENTRY_CHARS + 1);
    await expect(
      handleProposeEntry(db, ctx, {
        project_id: "00000000-0000-0000-0000-000000000100",
        space_id: "00000000-0000-0000-0000-000000000200",
        content: oversize,
        rationale: "test"
      })
    ).rejects.toBeInstanceOf(KontexError);
    expect(mocks.requireProjectMember).not.toHaveBeenCalled();
  });

  it("inserts a pending change of type 'new' for valid content", async () => {
    const db = dbReturning("change-1");
    const result = await handleProposeEntry(db, ctx, {
      project_id: "00000000-0000-0000-0000-000000000100",
      space_id: "00000000-0000-0000-0000-000000000200",
      title: "T",
      content: "hello",
      rationale: "logging"
    });
    expect(result).toEqual({ change_id: "change-1", status: "pending" });
    expect(mocks.requireProjectMember).toHaveBeenCalledOnce();
    expect(mocks.requireSpaceEditor).toHaveBeenCalledOnce();
  });

  it("rejects callers without editor role on the target space", async () => {
    mocks.requireSpaceEditor.mockRejectedValueOnce(
      new KontexError("insufficient_role", "must be editor")
    );
    const db = dbReturning("never");
    await expect(
      handleProposeEntry(db, ctx, {
        project_id: "00000000-0000-0000-0000-000000000100",
        space_id: "00000000-0000-0000-0000-000000000200",
        content: "hi",
        rationale: "r"
      })
    ).rejects.toBeInstanceOf(KontexError);
  });
});
