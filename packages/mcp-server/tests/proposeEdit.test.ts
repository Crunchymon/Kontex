import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../src/db.js";
import type { AuthContext } from "../src/auth.js";
import type { EmbeddingClient } from "../src/embeddings.js";
import { handleProposeEdit } from "../src/tools/proposeEdit.js";
import { KontexError } from "../src/errors.js";

const mocks = vi.hoisted(() => ({
  requireProjectMember: vi.fn(),
  getSpaceRole: vi.fn(),
  applyApproval: vi.fn()
}));

vi.mock("../src/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/auth.js")>();
  return {
    ...actual,
    requireProjectMember: mocks.requireProjectMember,
    getSpaceRole: mocks.getSpaceRole
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

const embeddings: EmbeddingClient = {
  embed: vi.fn().mockResolvedValue(new Array(768).fill(0.1))
};

function buildDb() {
  const entry = {
    id: "00000000-0000-0000-0000-000000000300",
    projectId: "00000000-0000-0000-0000-000000000100",
    spaceId: "00000000-0000-0000-0000-000000000200",
    title: "Original",
    content: "before",
    status: "active",
    createdBy: ctx.user.id
  };
  const change = {
    id: "00000000-0000-0000-0000-000000000400",
    ...entry,
    type: "edit",
    proposedTitle: "New",
    proposedContent: "after",
    proposedBy: ctx.user.id,
    rationale: "why",
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
    status: "pending",
    createdAt: new Date()
  };
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([entry]) })
      })
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([change]) })
      })
    });
  const insert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: change.id }])
    })
  });
  return { select, insert } as unknown as Database;
}

describe("handleProposeEdit", () => {
  beforeEach(() => {
    mocks.requireProjectMember.mockReset().mockResolvedValue({ projectRole: "member" });
    mocks.getSpaceRole.mockReset().mockResolvedValue("editor");
    mocks.applyApproval.mockReset().mockResolvedValue({ entryId: "entry-1" });
  });

  it("auto-applies edit when caller is editor", async () => {
    const result = await handleProposeEdit(buildDb(), embeddings, ctx, {
      project_id: "00000000-0000-0000-0000-000000000100",
      entry_id: "00000000-0000-0000-0000-000000000300",
      new_content: "after",
      rationale: "reason"
    });
    expect(result).toMatchObject({
      status: "approved",
      resolved: true,
      entry_id: "entry-1"
    });
    expect(mocks.applyApproval).toHaveBeenCalledOnce();
  });

  it("queues edit when caller is reader", async () => {
    mocks.getSpaceRole.mockResolvedValueOnce("reader");
    const result = await handleProposeEdit(buildDb(), embeddings, ctx, {
      project_id: "00000000-0000-0000-0000-000000000100",
      entry_id: "00000000-0000-0000-0000-000000000300",
      new_content: "after",
      rationale: "reason"
    });
    expect(result).toMatchObject({ status: "pending" });
    expect(mocks.applyApproval).not.toHaveBeenCalled();
  });

  it("rejects when caller has no space role", async () => {
    mocks.getSpaceRole.mockResolvedValueOnce(null);
    await expect(
      handleProposeEdit(buildDb(), embeddings, ctx, {
        project_id: "00000000-0000-0000-0000-000000000100",
        entry_id: "00000000-0000-0000-0000-000000000300",
        new_content: "after",
        rationale: "reason"
      })
    ).rejects.toBeInstanceOf(KontexError);
  });
});
