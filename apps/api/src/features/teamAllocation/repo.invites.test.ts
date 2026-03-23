import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    teamInvite: { updateMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    team: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: mocks.prisma }));

import { createTeamInviteRecord, updateInviteStatusFromPending } from "./repo.invites.js";

describe("repo invites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when invite transition updates nothing", async () => {
    mocks.prisma.teamInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateInviteStatusFromPending("i-1", "DECLINED", new Date())).resolves.toBeNull();
  });

  it("returns updated invite when transition succeeds", async () => {
    mocks.prisma.teamInvite.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.teamInvite.findUnique.mockResolvedValue({ id: "i-1", status: "DECLINED" });
    await expect(updateInviteStatusFromPending("i-1", "DECLINED", new Date())).resolves.toEqual({
      id: "i-1",
      status: "DECLINED",
    });
  });

  it("creates invite with pending defaults", async () => {
    const payload = { teamId: 1, inviterId: 2, inviteeEmail: "u@x.com", tokenHash: "h", expiresAt: new Date() };
    mocks.prisma.teamInvite.create.mockResolvedValue({ id: "i-2" });
    await createTeamInviteRecord(payload);
    expect(mocks.prisma.teamInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", active: true }) }),
    );
  });
});