import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveDraftTeam,
  applyManualAllocationTeam,
  applyRandomAllocationPlan,
  createTeamInviteRecord,
  findModuleStudentsForManualAllocation,
  findVacantModuleStudentsForProject,
  findProjectTeamSummaries,
  findStaffScopedProject,
  findActiveInvite,
  findInviteContext,
  getInvitesForTeam,
  updateInviteStatusFromPending,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    teamInvite: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teamAllocation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("teamAllocation repo allocation transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("applyRandomAllocationPlan validates vacancies and existing names before creating teams", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([{ teamName: "Team A" }]),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 11, teamName: "Random Team 1" })
          .mockResolvedValueOnce({ id: 22, teamName: "Random Team 2" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    const result = await applyRandomAllocationPlan(5, "ent-1", [
      { members: [{ id: 1 }, { id: 2 }] },
      { members: [{ id: 3 }] },
    ]);

    expect(result).toEqual([
      { id: 11, teamName: "Random Team 1", memberCount: 2 },
      { id: 22, teamName: "Random Team 2", memberCount: 1 },
    ]);
    expect(tx.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        userId: { in: [1, 2, 3] },
        team: {
          projectId: 5,
          archivedAt: null,
        },
      },
      select: { userId: true },
    });
    expect(tx.team.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1" },
      select: { teamName: true },
    });
  });

  it("applyRandomAllocationPlan creates teams and allocations for each planned group", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([{ teamName: "Team A" }]),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 11, teamName: "Random Team 1" })
          .mockResolvedValueOnce({ id: 22, teamName: "Random Team 2" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await applyRandomAllocationPlan(5, "ent-1", [
      { members: [{ id: 1 }, { id: 2 }] },
      { members: [{ id: 3 }] },
    ]);

    expect(tx.team.create).toHaveBeenNthCalledWith(1, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Random Team 1",
        allocationLifecycle: "DRAFT",
        draftCreatedById: null,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: { id: true, teamName: true },
    });
    expect(tx.team.create).toHaveBeenNthCalledWith(2, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Random Team 2",
        allocationLifecycle: "DRAFT",
        draftCreatedById: null,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: { id: true, teamName: true },
    });
    expect(tx.teamAllocation.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        { teamId: 11, userId: 1 },
        { teamId: 11, userId: 2 },
      ],
      skipDuplicates: true,
    });
    expect(tx.teamAllocation.createMany).toHaveBeenNthCalledWith(2, {
      data: [{ teamId: 22, userId: 3 }],
      skipDuplicates: true,
    });
  });

  it("applyRandomAllocationPlan throws when one of the target team names already exists", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([
          { teamName: "Random Team 1" },
        ]),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyRandomAllocationPlan(5, "ent-1", [
        { members: [{ id: 1 }] },
        { members: [{ id: 2 }] },
      ]),
    ).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });
    expect(tx.team.create).not.toHaveBeenCalled();
  });

  it("applyRandomAllocationPlan uses supplied team names", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([{ teamName: "Existing Team" }]),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 11, teamName: "Team Orion" })
          .mockResolvedValueOnce({ id: 22, teamName: "Team Vega" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    const result = await applyRandomAllocationPlan(
      5,
      "ent-1",
      [
        { members: [{ id: 1 }] },
        { members: [{ id: 2 }] },
      ],
      { teamNames: ["Team Orion", "Team Vega"] },
    );

    expect(result).toEqual([
      { id: 11, teamName: "Team Orion", memberCount: 1 },
      { id: 22, teamName: "Team Vega", memberCount: 1 },
    ]);
  });

  it("applyRandomAllocationPlan passes each supplied team name into create calls", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([{ teamName: "Existing Team" }]),
        create: vi.fn()
          .mockResolvedValueOnce({ id: 11, teamName: "Team Orion" })
          .mockResolvedValueOnce({ id: 22, teamName: "Team Vega" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await applyRandomAllocationPlan(
      5,
      "ent-1",
      [
        { members: [{ id: 1 }] },
        { members: [{ id: 2 }] },
      ],
      { teamNames: ["Team Orion", "Team Vega"] },
    );

    expect(tx.team.create).toHaveBeenNthCalledWith(1, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Orion",
        allocationLifecycle: "DRAFT",
        draftCreatedById: null,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: { id: true, teamName: true },
    });
    expect(tx.team.create).toHaveBeenNthCalledWith(2, {
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Vega",
        allocationLifecycle: "DRAFT",
        draftCreatedById: null,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: { id: true, teamName: true },
    });
  });

  it("applyRandomAllocationPlan stores draft creator when provided", async () => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValueOnce({ id: 31, teamName: "Team Orion" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await applyRandomAllocationPlan(
      5,
      "ent-1",
      [{ members: [{ id: 1 }] }],
      { teamNames: ["Team Orion"], draftCreatedById: 99 },
    );

    expect(tx.team.create).toHaveBeenCalledWith({
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Orion",
        allocationLifecycle: "DRAFT",
        draftCreatedById: 99,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: { id: true, teamName: true },
    });
  });

  it("applyRandomAllocationPlan throws when planned students are no longer vacant", async () => {
    const tx = {
      team: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([{ userId: 2 }]),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyRandomAllocationPlan(5, "ent-1", [
        { members: [{ id: 1 }, { id: 2 }] },
        { members: [{ id: 3 }] },
      ]),
    ).rejects.toEqual({ code: "STUDENTS_NO_LONGER_VACANT" });

    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
    expect(tx.team.findMany).not.toHaveBeenCalled();
  });

  it("applyManualAllocationTeam returns created team summary", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 44, teamName: "Team Gamma" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyManualAllocationTeam(5, "ent-1", "Team Gamma", [7, 8]),
    ).resolves.toEqual({
      id: 44,
      teamName: "Team Gamma",
      memberCount: 2,
    });
  });

  it("applyManualAllocationTeam checks conflicts then creates allocations", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 44, teamName: "Team Gamma" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await applyManualAllocationTeam(5, "ent-1", "Team Gamma", [7, 8]);

    expect(tx.team.findFirst).toHaveBeenCalledWith({
      where: {
        enterpriseId: "ent-1",
        teamName: "Team Gamma",
      },
      select: {
        id: true,
      },
    });
    expect(tx.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        userId: { in: [7, 8] },
        team: {
          projectId: 5,
          archivedAt: null,
        },
      },
      select: {
        userId: true,
      },
    });
    expect(tx.team.create).toHaveBeenCalledWith({
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Gamma",
        allocationLifecycle: "DRAFT",
        draftCreatedById: null,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: {
        id: true,
        teamName: true,
      },
    });
    expect(tx.teamAllocation.createMany).toHaveBeenCalledWith({
      data: [
        { teamId: 44, userId: 7 },
        { teamId: 44, userId: 8 },
      ],
      skipDuplicates: true,
    });
  });

  it("applyManualAllocationTeam stores draft creator when provided", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 55, teamName: "Team Draft" }),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await applyManualAllocationTeam(5, "ent-1", "Team Draft", [7], { draftCreatedById: 44 });

    expect(tx.team.create).toHaveBeenCalledWith({
      data: {
        enterpriseId: "ent-1",
        projectId: 5,
        teamName: "Team Draft",
        allocationLifecycle: "DRAFT",
        draftCreatedById: 44,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: {
        id: true,
        teamName: true,
      },
    });
  });

  it("applyManualAllocationTeam throws when team name already exists", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue({ id: 90 }),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn(),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyManualAllocationTeam(5, "ent-1", "Team Gamma", [7, 8]),
    ).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });

    expect(tx.teamAllocation.findMany).not.toHaveBeenCalled();
    expect(tx.team.create).not.toHaveBeenCalled();
    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("applyManualAllocationTeam throws when students are no longer available", async () => {
    const tx = {
      team: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      teamAllocation: {
        findMany: vi.fn().mockResolvedValue([{ userId: 8 }]),
        createMany: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(
      applyManualAllocationTeam(5, "ent-1", "Team Gamma", [7, 8]),
    ).rejects.toEqual({ code: "STUDENTS_NO_LONGER_AVAILABLE" });

    expect(tx.team.create).not.toHaveBeenCalled();
    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("approveDraftTeam transitions lifecycle to ACTIVE and returns approved members", async () => {
    const tx = {
      team: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 44,
          teamName: "Draft Team",
          allocations: [
            {
              user: {
                id: 7,
                firstName: "Ada",
                lastName: "Lovelace",
                email: "ada@example.com",
              },
            },
            {
              user: {
                id: 8,
                firstName: "Linus",
                lastName: "Torvalds",
                email: "linus@example.com",
              },
            },
          ],
          _count: {
            allocations: 2,
          },
        }),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    const result = await approveDraftTeam(44, 99);

    expect(tx.team.updateMany).toHaveBeenCalledWith({
      where: {
        id: 44,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
      },
      data: {
        allocationLifecycle: "ACTIVE",
        draftApprovedById: 99,
        draftApprovedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      id: 44,
      teamName: "Draft Team",
      memberCount: 2,
      members: [
        {
          id: 7,
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
        },
        {
          id: 8,
          firstName: "Linus",
          lastName: "Torvalds",
          email: "linus@example.com",
        },
      ],
    });
  });

  it("approveDraftTeam returns null when draft cannot be approved", async () => {
    const tx = {
      team: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn(),
      },
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));

    await expect(approveDraftTeam(44, 99)).resolves.toBeNull();
    expect(tx.team.findUnique).not.toHaveBeenCalled();
  });
});