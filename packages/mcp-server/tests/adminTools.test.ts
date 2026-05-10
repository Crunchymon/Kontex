import { describe, expect, it, vi } from "vitest";
import type { Database } from "../src/db.js";
import { KontexError } from "../src/errors.js";
import { applyProjectInvite, guardProjectRoleUpdate } from "../src/tools/_admin.js";

describe("guardProjectRoleUpdate", () => {
  it("rejects demoting the project creator", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ createdBy: "u1" }]) })
          })
        })
    } as unknown as Database;

    await expect(guardProjectRoleUpdate(db, "p1", "u1", "member")).rejects.toBeInstanceOf(KontexError);
  });

  it("rejects removing the last admin", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ createdBy: "owner" }]) })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ projectRole: "admin" }]) })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }])
          })
        })
    } as unknown as Database;

    await expect(guardProjectRoleUpdate(db, "p1", "u2", "remove")).rejects.toBeInstanceOf(KontexError);
  });
});

describe("applyProjectInvite", () => {
  it("queues invite for users not yet signed in", async () => {
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    });
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) })
        })
      }),
      insert
    } as unknown as Database;

    const result = await applyProjectInvite(db, "admin-1", {
      projectId: "p1",
      email: "new@example.com",
      projectRole: "member",
      spaceId: "s1",
      spaceRole: "editor"
    });

    expect(result.status).toBe("queued");
    expect(insert).toHaveBeenCalledOnce();
  });
});
