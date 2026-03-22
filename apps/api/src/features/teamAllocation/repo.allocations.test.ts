import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveDraftTeam, applyManualAllocationTeam, applyRandomAllocationPlan } from "./repo.js";
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

const PROJECT_ID = 5;
const ENTERPRISE_ID = "ent-1";
const RANDOM_PLAN = [
  { members: [{ id: 1 }, { id: 2 }] },
  { members: [{ id: 3 }] },
];
const DEFAULT_DRAFT_UPDATED_AT = new Date("2026-01-01T00:00:00.000Z");

type TeamRow = { id: number; teamName: string };

function setupTransaction<T>(tx: T): T {
  (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));
  return tx;
}

function buildDraftTeamCreateArgs(teamName: string, draftCreatedById: number | null = null) {
  return {
    data: {
      enterpriseId: ENTERPRISE_ID,
      projectId: PROJECT_ID,
      teamName,
      allocationLifecycle: "DRAFT",
      draftCreatedById,
      draftApprovedById: null,
      draftApprovedAt: null,
    },
    select: { id: true, teamName: true },
  };
}

function buildRandomAllocationTx(options: {
  existingTeamNames?: string[];
  createdTeams?: TeamRow[];
  occupiedUserIds?: number[];
  createManyCount?: number;
} = {}) {
  const {
    existingTeamNames = ["Team A"],
    createdTeams = [
      { id: 11, teamName: "Random Team 1" },
      { id: 22, teamName: "Random Team 2" },
    ],
    occupiedUserIds = [],
    createManyCount = 2,
  } = options;

  const create = vi.fn();
  for (const team of createdTeams) {
    create.mockResolvedValueOnce(team);
  }

  return {
    team: {
      findMany: vi.fn().mockResolvedValue(existingTeamNames.map((teamName) => ({ teamName }))),
      create,
    },
    teamAllocation: {
      findMany: vi.fn().mockResolvedValue(occupiedUserIds.map((userId) => ({ userId }))),
      createMany: vi.fn().mockResolvedValue({ count: createManyCount }),
    },
  };
}

function buildManualAllocationTx(options: {
  existingTeamId?: number | null;
  createdTeam?: TeamRow;
  conflictingUserIds?: number[];
  createManyCount?: number;
} = {}) {
  const {
    existingTeamId = null,
    createdTeam = { id: 44, teamName: "Team Gamma" },
    conflictingUserIds = [],
    createManyCount = 2,
  } = options;

  return {
    team: {
      findFirst: vi.fn().mockResolvedValue(existingTeamId === null ? null : { id: existingTeamId }),
      create: vi.fn().mockResolvedValue(createdTeam),
    },
    teamAllocation: {
      findMany: vi.fn().mockResolvedValue(conflictingUserIds.map((userId) => ({ userId }))),
      createMany: vi.fn().mockResolvedValue({ count: createManyCount }),
    },
  };
}

function buildApproveDraftTx(options: {
  draftTeam?: { id: number; projectId: number; updatedAt: Date } | null;
  draftMemberIds?: number[];
  activeConflictUserIds?: number[];
  updateCount?: number;
  approvedTeam?: any;
} = {}) {
  const {
    draftTeam = { id: 44, projectId: PROJECT_ID, updatedAt: DEFAULT_DRAFT_UPDATED_AT },
    draftMemberIds = [7, 8],
    activeConflictUserIds = [],
    updateCount = 1,
    approvedTeam = {
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
    },
  } = options;

  const findMany = vi.fn().mockResolvedValueOnce(draftMemberIds.map((userId) => ({ userId })));
  if (draftMemberIds.length > 0) {
    findMany.mockResolvedValueOnce(activeConflictUserIds.map((userId) => ({ userId })));
  }

  return {
    team: {
      findFirst: vi.fn().mockResolvedValue(draftTeam),
      updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
      findUnique: vi.fn().mockResolvedValue(approvedTeam),
    },
    teamAllocation: {
      findMany,
    },
  };
}

describe("teamAllocation repo allocation transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applyRandomAllocationPlan validates, creates teams, and stores allocations for each planned group", async () => {
    const tx = setupTransaction(buildRandomAllocationTx());

    const result = await applyRandomAllocationPlan(PROJECT_ID, ENTERPRISE_ID, RANDOM_PLAN);

    expect(result).toEqual([
      { id: 11, teamName: "Random Team 1", memberCount: 2 },
      { id: 22, teamName: "Random Team 2", memberCount: 1 },
    ]);
    expect(tx.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        userId: { in: [1, 2, 3] },
        team: {
          projectId: PROJECT_ID,
          archivedAt: null,
        },
      },
      select: { userId: true },
    });
    expect(tx.team.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: ENTERPRISE_ID },
      select: { teamName: true },
    });
    expect(tx.team.create).toHaveBeenNthCalledWith(1, buildDraftTeamCreateArgs("Random Team 1"));
    expect(tx.team.create).toHaveBeenNthCalledWith(2, buildDraftTeamCreateArgs("Random Team 2"));
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
    const tx = setupTransaction(buildRandomAllocationTx({ existingTeamNames: ["Random Team 1"], createdTeams: [] }));

    await expect(
      applyRandomAllocationPlan(PROJECT_ID, ENTERPRISE_ID, [
        { members: [{ id: 1 }] },
        { members: [{ id: 2 }] },
      ]),
    ).rejects.toEqual({ code: "TEAM_NAME_ALREADY_EXISTS" });

    expect(tx.team.create).not.toHaveBeenCalled();
  });

  it("applyRandomAllocationPlan uses supplied team names and passes each name into create", async () => {
    const tx = setupTransaction(buildRandomAllocationTx({
      existingTeamNames: ["Existing Team"],
      createdTeams: [
        { id: 11, teamName: "Team Orion" },
        { id: 22, teamName: "Team Vega" },
      ],
      createManyCount: 1,
    }));

    const result = await applyRandomAllocationPlan(
      PROJECT_ID,
      ENTERPRISE_ID,
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
    expect(tx.team.create).toHaveBeenNthCalledWith(1, buildDraftTeamCreateArgs("Team Orion"));
    expect(tx.team.create).toHaveBeenNthCalledWith(2, buildDraftTeamCreateArgs("Team Vega"));
  });

  it("applyRandomAllocationPlan stores draft creator when provided", async () => {
    const tx = setupTransaction(buildRandomAllocationTx({
      existingTeamNames: [],
      createdTeams: [{ id: 31, teamName: "Team Orion" }],
      createManyCount: 1,
    }));

    await applyRandomAllocationPlan(
      PROJECT_ID,
      ENTERPRISE_ID,
      [{ members: [{ id: 1 }] }],
      { teamNames: ["Team Orion"], draftCreatedById: 99 },
    );

    expect(tx.team.create).toHaveBeenCalledWith(buildDraftTeamCreateArgs("Team Orion", 99));
  });

  it("applyRandomAllocationPlan throws when planned students are no longer vacant", async () => {
    const tx = setupTransaction(buildRandomAllocationTx({
      existingTeamNames: [],
      createdTeams: [],
      occupiedUserIds: [2],
    }));

    await expect(applyRandomAllocationPlan(PROJECT_ID, ENTERPRISE_ID, RANDOM_PLAN)).rejects.toEqual({
      code: "STUDENTS_NO_LONGER_VACANT",
    });

    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
    expect(tx.team.findMany).not.toHaveBeenCalled();
  });

  it("applyManualAllocationTeam checks conflicts, creates allocations, and returns team summary", async () => {
    const tx = setupTransaction(buildManualAllocationTx());

    const result = await applyManualAllocationTeam(PROJECT_ID, ENTERPRISE_ID, "Team Gamma", [7, 8]);

    expect(result).toEqual({
      id: 44,
      teamName: "Team Gamma",
      memberCount: 2,
    });
    expect(tx.team.findFirst).toHaveBeenCalledWith({
      where: {
        enterpriseId: ENTERPRISE_ID,
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
          projectId: PROJECT_ID,
          archivedAt: null,
        },
      },
      select: {
        userId: true,
      },
    });
    expect(tx.team.create).toHaveBeenCalledWith(buildDraftTeamCreateArgs("Team Gamma"));
    expect(tx.teamAllocation.createMany).toHaveBeenCalledWith({
      data: [
        { teamId: 44, userId: 7 },
        { teamId: 44, userId: 8 },
      ],
      skipDuplicates: true,
    });
  });

  it("applyManualAllocationTeam stores draft creator when provided", async () => {
    const tx = setupTransaction(buildManualAllocationTx({
      createdTeam: { id: 55, teamName: "Team Draft" },
      createManyCount: 1,
    }));

    await applyManualAllocationTeam(PROJECT_ID, ENTERPRISE_ID, "Team Draft", [7], { draftCreatedById: 44 });

    expect(tx.team.create).toHaveBeenCalledWith(buildDraftTeamCreateArgs("Team Draft", 44));
  });

  it("applyManualAllocationTeam throws when team name already exists", async () => {
    const tx = setupTransaction(buildManualAllocationTx({ existingTeamId: 90 }));

    await expect(applyManualAllocationTeam(PROJECT_ID, ENTERPRISE_ID, "Team Gamma", [7, 8])).rejects.toEqual({
      code: "TEAM_NAME_ALREADY_EXISTS",
    });

    expect(tx.teamAllocation.findMany).not.toHaveBeenCalled();
    expect(tx.team.create).not.toHaveBeenCalled();
    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("applyManualAllocationTeam throws when students are no longer available", async () => {
    const tx = setupTransaction(buildManualAllocationTx({ conflictingUserIds: [8] }));

    await expect(applyManualAllocationTeam(PROJECT_ID, ENTERPRISE_ID, "Team Gamma", [7, 8])).rejects.toEqual({
      code: "STUDENTS_NO_LONGER_AVAILABLE",
    });

    expect(tx.team.create).not.toHaveBeenCalled();
    expect(tx.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("approveDraftTeam transitions lifecycle to ACTIVE and returns approved members", async () => {
    const tx = setupTransaction(buildApproveDraftTx());

    const result = await approveDraftTeam(44, 99);

    expect(tx.team.updateMany).toHaveBeenCalledWith({
      where: {
        id: 44,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
        updatedAt: DEFAULT_DRAFT_UPDATED_AT,
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

  it("approveDraftTeam returns null when draft cannot be found", async () => {
    const tx = setupTransaction(buildApproveDraftTx({ draftTeam: null }));

    await expect(approveDraftTeam(44, 99)).resolves.toBeNull();

    expect(tx.teamAllocation.findMany).not.toHaveBeenCalled();
    expect(tx.team.updateMany).not.toHaveBeenCalled();
    expect(tx.team.findUnique).not.toHaveBeenCalled();
  });
});
