import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../src/db.js";
import type { AuthContext } from "../src/auth.js";
import type { EmbeddingClient } from "../src/embeddings.js";
import { handleResolveChange } from "../src/tools/resolveChange.js";
import { KontexError } from "../src/errors.js";
import { entries, entryVersions, pendingChanges } from "@kontex/shared";

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

const buildEmbeddings = (): EmbeddingClient => ({
  embed: vi.fn().mockResolvedValue(new Array(768).fill(0.1))
});

type Plan = {
  pendingRow?: Record<string, unknown> | null;
  entryRow?: Record<string, unknown> | null;
  versionRows?: Array<{ id: string }>;
};

function tableName(t: unknown): "entries" | "entry_versions" | "pending_changes" | "unknown" {
  if (t === entries) return "entries";
  if (t === entryVersions) return "entry_versions";
  if (t === pendingChanges) return "pending_changes";
  return "unknown";
}

function buildDb(plan: Plan) {
  const insertedEntry = { id: "new-entry-id" };
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; values: Record<string, unknown> }> = [];

  const fromImpl = (table: unknown) => {
    const name = tableName(table);
    return {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(async () => {
          if (name === "pending_changes") return plan.pendingRow ? [plan.pendingRow] : [];
          if (name === "entries") return plan.entryRow ? [plan.entryRow] : [];
          return [];
        })
      })
    };
  };

  const select = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: unknown) => {
      const name = tableName(table);
      if (name === "entry_versions") {
        return {
          where: vi.fn().mockResolvedValue(plan.versionRows ?? [])
        };
      }
      return fromImpl(table);
    })
  }));

  const insert = vi.fn().mockImplementation((table: unknown) => {
    const name = tableName(table);
    return {
      values: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        inserts.push({ table: name, values });
        return {
          returning: vi.fn().mockResolvedValue([insertedEntry])
        };
      })
    };
  });

  const update = vi.fn().mockImplementation((table: unknown) => {
    const name = tableName(table);
    return {
      set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        updates.push({ table: name, values });
        return {
          where: vi.fn().mockResolvedValue(undefined)
        };
      })
    };
  });

  return { db: { select, insert, update } as unknown as Database, updates, inserts };
}

const projectId = "00000000-0000-0000-0000-000000000100";
const spaceId = "00000000-0000-0000-0000-000000000200";
const entryId = "00000000-0000-0000-0000-000000000300";
const changeId = "00000000-0000-0000-0000-000000000400";

describe("handleResolveChange", () => {
  beforeEach(() => {
    mocks.requireProjectMember.mockReset().mockResolvedValue({ projectRole: "member" });
    mocks.requireSpaceEditor.mockReset().mockResolvedValue({ spaceRole: "editor" });
  });

  it("rejects when the change does not exist", async () => {
    const { db } = buildDb({ pendingRow: null });
    await expect(
      handleResolveChange(db, buildEmbeddings(), ctx, {
        project_id: projectId,
        change_id: changeId,
        decision: "approve"
      })
    ).rejects.toBeInstanceOf(KontexError);
  });

  it("rejects when the change is not in 'pending' status", async () => {
    const { db } = buildDb({
      pendingRow: {
        id: changeId,
        projectId,
        spaceId,
        type: "new",
        status: "approved"
      }
    });
    await expect(
      handleResolveChange(db, buildEmbeddings(), ctx, {
        project_id: projectId,
        change_id: changeId,
        decision: "approve"
      })
    ).rejects.toBeInstanceOf(KontexError);
  });

  it("approves a 'new' change by inserting an entry and marking the change approved", async () => {
    const { db, inserts, updates } = buildDb({
      pendingRow: {
        id: changeId,
        projectId,
        spaceId,
        type: "new",
        status: "pending",
        proposedContent: "hello",
        proposedTitle: "T",
        proposedBy: ctx.user.id,
        entryId: null,
        rationale: "r"
      }
    });
    const result = await handleResolveChange(db, buildEmbeddings(), ctx, {
      project_id: projectId,
      change_id: changeId,
      decision: "approve"
    });
    expect(result).toMatchObject({ resolved: true, decision: "approve", entry_id: "new-entry-id" });
    expect(inserts.find((i) => i.table === "entries")).toBeDefined();
    expect(updates.find((u) => u.table === "pending_changes" && u.values.status === "approved")).toBeDefined();
  });

  it("approves an 'edit' change by archiving prior content into entry_versions and updating the entry", async () => {
    const { db, inserts, updates } = buildDb({
      pendingRow: {
        id: changeId,
        projectId,
        spaceId,
        type: "edit",
        status: "pending",
        proposedContent: "new content",
        proposedTitle: null,
        proposedBy: ctx.user.id,
        entryId,
        rationale: "fix typo"
      },
      entryRow: {
        id: entryId,
        projectId,
        spaceId,
        title: "Old title",
        content: "old content",
        status: "active",
        createdBy: ctx.user.id
      },
      versionRows: []
    });

    const result = await handleResolveChange(db, buildEmbeddings(), ctx, {
      project_id: projectId,
      change_id: changeId,
      decision: "approve"
    });
    expect(result).toMatchObject({ resolved: true, decision: "approve", entry_id: entryId });
    const versionInsert = inserts.find((i) => i.table === "entry_versions");
    expect(versionInsert).toBeDefined();
    expect(versionInsert?.values).toMatchObject({
      entryId,
      content: "old content",
      version: 1
    });
    expect(updates.find((u) => u.table === "entries")).toBeDefined();
  });

  it("approves an 'archive' change by flipping entry status without re-embedding", async () => {
    const embeddings = buildEmbeddings();
    const { db, updates } = buildDb({
      pendingRow: {
        id: changeId,
        projectId,
        spaceId,
        type: "archive",
        status: "pending",
        entryId,
        proposedBy: ctx.user.id,
        rationale: "duplicate"
      }
    });
    const result = await handleResolveChange(db, embeddings, ctx, {
      project_id: projectId,
      change_id: changeId,
      decision: "approve"
    });
    expect(result).toMatchObject({ resolved: true, decision: "approve", entry_id: entryId });
    expect(embeddings.embed).not.toHaveBeenCalled();
    const archiveUpdate = updates.find((u) => u.table === "entries" && u.values.status === "archived");
    expect(archiveUpdate).toBeDefined();
  });

  it("rejects only updates the change row and never touches entries", async () => {
    const embeddings = buildEmbeddings();
    const { db, updates } = buildDb({
      pendingRow: {
        id: changeId,
        projectId,
        spaceId,
        type: "edit",
        status: "pending",
        entryId,
        proposedContent: "x",
        proposedBy: ctx.user.id,
        rationale: "r"
      }
    });
    const result = await handleResolveChange(db, embeddings, ctx, {
      project_id: projectId,
      change_id: changeId,
      decision: "reject",
      reason: "not relevant"
    });
    expect(result).toMatchObject({ resolved: true, decision: "reject" });
    expect(updates.every((u) => u.table === "pending_changes")).toBe(true);
    expect(embeddings.embed).not.toHaveBeenCalled();
  });
});
