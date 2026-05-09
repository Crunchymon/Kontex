import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../src/db.js";
import type { AuthContext } from "../src/auth.js";
import type { EmbeddingClient } from "../src/embeddings.js";
import { handleQueryContext } from "../src/tools/queryContext.js";

const mocks = vi.hoisted(() => ({
  requireProjectMember: vi.fn(),
  requireSpaceMember: vi.fn(),
  listUserSpacesInProject: vi.fn()
}));

vi.mock("../src/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/auth.js")>();
  return {
    ...actual,
    requireProjectMember: mocks.requireProjectMember,
    requireSpaceMember: mocks.requireSpaceMember,
    listUserSpacesInProject: mocks.listUserSpacesInProject
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

function buildEmbeddings(): EmbeddingClient {
  return {
    embed: vi.fn().mockResolvedValue(new Array(768).fill(0.1))
  };
}

function buildDb(rows: Array<Record<string, unknown>>): { db: Database; calls: { whereArgs: unknown[] } } {
  const calls = { whereArgs: [] as unknown[] };
  const select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn((arg) => {
        calls.whereArgs.push(arg);
        return {
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(rows)
          })
        };
      })
    })
  });
  return { db: { select } as unknown as Database, calls };
}

describe("handleQueryContext", () => {
  beforeEach(() => {
    mocks.requireProjectMember.mockReset().mockResolvedValue({ projectRole: "member" });
    mocks.requireSpaceMember.mockReset().mockResolvedValue({ spaceRole: "reader" });
    mocks.listUserSpacesInProject.mockReset().mockResolvedValue([
      "00000000-0000-0000-0000-000000000201",
      "00000000-0000-0000-0000-000000000202"
    ]);
  });

  it("returns an empty result set when the user has no accessible spaces in the project", async () => {
    mocks.listUserSpacesInProject.mockResolvedValueOnce([]);
    const { db } = buildDb([]);
    const result = await handleQueryContext(db, buildEmbeddings(), ctx, {
      project_id: "00000000-0000-0000-0000-000000000100",
      query: "anything"
    });
    expect(result).toEqual({ results: [] });
  });

  it("filters to a single space when space_id is provided and verifies membership", async () => {
    const { db } = buildDb([
      {
        id: "e1",
        title: "T",
        content: "c",
        spaceId: "00000000-0000-0000-0000-000000000201",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        similarity: 0.95
      }
    ]);
    const result = await handleQueryContext(db, buildEmbeddings(), ctx, {
      project_id: "00000000-0000-0000-0000-000000000100",
      space_id: "00000000-0000-0000-0000-000000000201",
      query: "eigenvalues"
    });
    expect(mocks.requireSpaceMember).toHaveBeenCalledOnce();
    expect(mocks.listUserSpacesInProject).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      entry_id: "e1",
      title: "T",
      similarity_score: 0.95
    });
  });

  it("widens to all accessible spaces when space_id is omitted", async () => {
    const { db } = buildDb([
      {
        id: "e2",
        title: null,
        content: "c2",
        spaceId: "00000000-0000-0000-0000-000000000202",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        similarity: 0.4
      }
    ]);
    await handleQueryContext(db, buildEmbeddings(), ctx, {
      project_id: "00000000-0000-0000-0000-000000000100",
      query: "anything"
    });
    expect(mocks.requireSpaceMember).not.toHaveBeenCalled();
    expect(mocks.listUserSpacesInProject).toHaveBeenCalledOnce();
  });
});
