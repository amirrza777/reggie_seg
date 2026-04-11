import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    teamInvite: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    team: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import {
  createTeamInviteRecord,
  findActiveInvite,
  findInviteContext,
  findPendingInvitesForEmail,
  getInvitesForTeam,
  updateInviteStatusFromPending,
} from "./repo.invites.js";

describe("repo.invites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findActiveInvite filters by active pending invite and active team", async () => {
    mocks.prisma.teamInvite.findFirst.mockResolvedValue({ id: "inv-1" });
    await expect(findActiveInvite(4, "a@x.com")).resolves.toEqual({ id: "inv-1" });
    expect(mocks.prisma.teamInvite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teamId: 4, inviteeEmail: "a@x.com", status: "PENDING", active: true }) }),
    );
  });

  it("createTeamInviteRecord persists pending active defaults", async () => {
    const expiresAt = new Date("2026-01-10T00:00:00.000Z");
    mocks.prisma.teamInvite.create.mockResolvedValue({ id: "inv-2" });
    await createTeamInviteRecord({ teamId: 4, inviterId: 9, inviteeEmail: "a@x.com", tokenHash: "hash", expiresAt });
    expect(mocks.prisma.teamInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", active: true, inviteeId: null, message: null }) }),
    );
  });

  it("findInviteContext returns selected team and inviter data", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ teamName: "Blue" });
    mocks.prisma.user.findUnique.mockResolvedValue({ firstName: "Ada" });
    const result = await findInviteContext(2, 3);
    expect(result).toEqual({ team: { teamName: "Blue" }, inviter: { firstName: "Ada" } });
  });

  it("getInvitesForTeam and findPendingInvitesForEmail query with expected filters", async () => {
    mocks.prisma.teamInvite.findMany.mockResolvedValueOnce([{ id: "a" }]).mockResolvedValueOnce([{ id: "b" }]);
    await expect(getInvitesForTeam(6)).resolves.toEqual([{ id: "a" }]);
    await expect(findPendingInvitesForEmail("u@x.com")).resolves.toEqual([{ id: "b" }]);
    expect(mocks.prisma.teamInvite.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expect.objectContaining({ inviteeEmail: "u@x.com", status: "PENDING", active: true }) }),
    );
  });

  it("returns null when pending invite for transition is missing", async () => {
    mocks.prisma.teamInvite.findFirst.mockResolvedValue(null);
    await expect(updateInviteStatusFromPending("inv-1", "DECLINED", new Date())).resolves.toBeNull();
  });

  it("returns null when transition loses race during update", async () => {
    mocks.prisma.teamInvite.findFirst.mockResolvedValue({ id: "inv-1", teamId: 3, inviteeEmail: "u@x.com" });
    mocks.prisma.teamInvite.deleteMany.mockResolvedValue({ count: 1 });
    mocks.prisma.teamInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateInviteStatusFromPending("inv-1", "DECLINED", new Date())).resolves.toBeNull();
  });

  it("updates pending invite, deactivates duplicates, and reloads row", async () => {
    mocks.prisma.teamInvite.findFirst.mockResolvedValue({ id: "inv-1", teamId: 3, inviteeEmail: "u@x.com" });
    mocks.prisma.teamInvite.deleteMany.mockResolvedValue({ count: 1 });
    mocks.prisma.teamInvite.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.teamInvite.findUnique.mockResolvedValue({ id: "inv-1", status: "DECLINED" });
    await expect(updateInviteStatusFromPending("inv-1", "DECLINED", new Date())).resolves.toEqual({
      id: "inv-1",
      status: "DECLINED",
    });
    expect(mocks.prisma.teamInvite.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teamId: 3, inviteeEmail: "u@x.com", active: false }) }),
    );
  });
});
