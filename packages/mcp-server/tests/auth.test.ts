import { describe, expect, it, vi } from "vitest";
import type { Database } from "../src/db.js";
import { claimPendingInvitationsForEmail } from "../src/auth.js";

describe("claimPendingInvitationsForEmail", () => {
  it("adds active pending email invitations to project and space memberships", async () => {
    const invitation = {
      id: "invite-1",
      projectId: "project-1",
      email: "new@example.com",
      token: null,
      projectRole: "member",
      spaceId: "space-1",
      spaceRole: "editor",
      invitedBy: "admin-1",
      expiresAt: null,
      acceptedAt: null,
      acceptedBy: null,
      revokedAt: null,
      createdAt: new Date()
    };

    const selectWhere = vi.fn().mockResolvedValue([invitation]);
    const projectValues = vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined)
    });
    const spaceValues = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
    });
    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined)
    });

    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: selectWhere
        })
      }),
      insert: vi
        .fn()
        .mockReturnValueOnce({ values: projectValues })
        .mockReturnValueOnce({ values: spaceValues }),
      update: vi.fn().mockReturnValue({
        set: updateSet
      })
    } as unknown as Database;

    await claimPendingInvitationsForEmail(db, "user-1", " NEW@example.com ");

    expect(projectValues).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      projectRole: "member"
    });
    expect(spaceValues).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      spaceId: "space-1",
      spaceRole: "editor"
    });
    expect(updateSet).toHaveBeenCalledWith({
      acceptedAt: expect.any(Date),
      acceptedBy: "user-1"
    });
  });

  it("skips expired invitations", async () => {
    const expiredInvitation = {
      id: "invite-1",
      projectId: "project-1",
      email: "new@example.com",
      token: null,
      projectRole: "member",
      spaceId: "space-1",
      spaceRole: "editor",
      invitedBy: "admin-1",
      expiresAt: new Date(Date.now() - 1_000),
      acceptedAt: null,
      acceptedBy: null,
      revokedAt: null,
      createdAt: new Date()
    };

    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expiredInvitation])
        })
      }),
      insert: vi.fn(),
      update: vi.fn()
    } as unknown as Database;

    await claimPendingInvitationsForEmail(db, "user-1", "new@example.com");

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
