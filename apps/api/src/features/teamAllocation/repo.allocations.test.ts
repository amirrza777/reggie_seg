import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    team: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    teamAllocation: { findMany: vi.fn(), createMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: mocks.prisma }));

import { TeamService, applyManualAllocationTeam, applyRandomAllocationPlan } from "./repo.allocations.js";

describe("repo allocations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (work: any) => work(mocks.prisma));
    mocks.prisma.teamAllocation.findMany.mockResolvedValue([]);
    mocks.prisma.team.findMany.mockResolvedValue([]);
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

  it("rejects mismatched requested team names", async () => {
    await expect(
      applyRandomAllocationPlan(2, "ent-1", [{ members: [{ id: 1 }] }, { members: [{ id: 2 }] }], {
        teamNames: ["Only one"],
      }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });
  });

  it("rejects manual allocation when team name already exists", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue({ id: 1 });
    await expect(applyManualAllocationTeam(2, "ent-1", "Existing", [1, 2])).rejects.toEqual({
      code: "TEAM_NAME_ALREADY_EXISTS",
    });
  });

  it.each(["createTeam", "getTeamById", "addUserToTeam", "getTeamMembers"])(
    "exposes TeamService.%s",
    (name) => {
      expect(TeamService).toHaveProperty(name);
    },
  );
});