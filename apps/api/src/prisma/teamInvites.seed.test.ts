import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    teamAllocation: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    teamInvite: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { planTeamInviteSeedData, seedTeamInvites } from "../../prisma/seed/teamInvites";

describe("planTeamInviteSeedData", () => {
  it("plans invite scenarios with expected status semantics", () => {
    const rows = planTeamInviteSeedData(
      [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      new Map([
        [1, [10]],
        [2, [20]],
        [3, [30]],
        [4, [40]],
        [5, [50]],
      ]),
      [
        { id: 101, email: "a@example.com" },
        { id: 102, email: "b@example.com" },
        { id: 103, email: "c@example.com" },
        { id: 104, email: "d@example.com" },
        { id: 105, email: "e@example.com" },
      ],
    );

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.status)).toEqual(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"]);
    expect(rows[0]?.active).toBe(true);
    expect(rows[0]?.respondedAt).toBeNull();
    expect(rows[1]?.active).toBe(false);
    expect(rows[1]?.respondedAt).toBeInstanceOf(Date);
    expect(rows[3]?.expiresAt.getTime()).toBeLessThan(Date.now());
    expect(rows[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("skips null teams and missing inviter/invitee candidates", () => {
    const rows = planTeamInviteSeedData(
      [undefined as unknown as { id: number }, { id: 2 }],
      new Map([[2, []]]),
      [],
    );

    expect(rows).toEqual([]);
  });
});

describe("seedTeamInvites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.teamInvite.findUnique.mockResolvedValue(null);
    prismaMock.teamInvite.upsert.mockResolvedValue({ id: 1 });
  });

  it("skips when prerequisites are missing", async () => {
    const result = await seedTeamInvites({
      teams: [],
      usersByRole: { students: [{ id: 1 }, { id: 2 }], adminOrStaff: [] },
    } as never);

    expect(result).toBeUndefined();
    expect(prismaMock.teamInvite.upsert).not.toHaveBeenCalled();
  });

  it("skips when no valid invite scenarios can be built", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 11, email: "x@example.com" }]);

    const result = await seedTeamInvites({
      teams: [{ id: 1 }, { id: 2 }, { id: 3 }],
      usersByRole: {
        students: [{ id: 101 }, { id: 102 }, { id: 103 }],
        adminOrStaff: [],
      },
    } as never);

    expect(result).toBeUndefined();
    expect(prismaMock.teamInvite.upsert).not.toHaveBeenCalled();
  });

  it("upserts planned invites and counts only newly created tokens", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { teamId: 1, userId: 201 },
      { teamId: 2, userId: 202 },
      { teamId: 3, userId: 203 },
    ]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: 301, email: "i1@example.com" },
      { id: 302, email: "i2@example.com" },
      { id: 303, email: "i3@example.com" },
    ]);
    let findIndex = 0;
    prismaMock.teamInvite.findUnique.mockImplementation(async () => (findIndex++ === 0 ? { id: 99 } : null));

    const result = await seedTeamInvites({
      teams: [{ id: 1 }, { id: 2 }, { id: 3 }],
      usersByRole: {
        students: [{ id: 301 }, { id: 302 }, { id: 303 }, { id: 304 }],
        adminOrStaff: [],
      },
    } as never);

    expect(result).toBeUndefined();
    expect(prismaMock.teamInvite.upsert).toHaveBeenCalledTimes(3);
    expect(prismaMock.teamInvite.upsert.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        create: expect.objectContaining({
          tokenHash: expect.stringContaining("seed-team-invite-"),
        }),
      }),
    );
  });
});
