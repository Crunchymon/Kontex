import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  dbImpl: vi.fn()
}));

vi.mock("../lib/db", () => ({
  db: () => state.dbImpl()
}));

describe("invitation helpers", () => {
  beforeEach(() => {
    state.dbImpl.mockReset();
  });

  it("claims pending email invitations idempotently", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "inv1",
              projectId: "p1",
              projectRole: "member",
              spaceId: "s1",
              spaceRole: "editor",
              expiresAt: null
            }
          ])
        })
      });
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
      })
    });
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
    state.dbImpl.mockReturnValue({ select, insert, update });

    const mod = await import("../lib/invitations");
    const result = await mod.claimPendingInvitationsForEmail("u1", "user@example.com");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ projectId: "p1", spaceId: "s1" });
  });

  it("accepts valid token invitation", async () => {
    const select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "inv2",
              projectId: "p2",
              projectRole: "member",
              spaceId: "s2",
              spaceRole: "editor",
              expiresAt: null
            }
          ])
        })
      })
    });
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
      })
    });
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
    state.dbImpl.mockReturnValue({ select, insert, update });

    const mod = await import("../lib/invitations");
    const result = await mod.acceptTokenInvitation("u1", "token");
    expect(result).toMatchObject({ projectId: "p2", spaceId: "s2" });
  });
});
