import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    projectStudent: { findFirst: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn() },
    team: { findFirst: vi.fn(), findMany: vi.fn() },
    teamAllocation: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import {
  findInviteEligibleStudentForTeamByEmail,
  findInviteEligibleStudentsForTeam,
  findModuleStudentsForManualAllocation,
  findProjectTeamSummaries,
  findVacantModuleStudentsForProject,
} from "./repo.scope.js";

describe("repo.scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findVacantModuleStudentsForProject applies project scope when needed", async () => {
    mocks.prisma.projectStudent.findFirst.mockResolvedValue({ userId: 10 });
    mocks.prisma.user.findMany.mockResolvedValue([{ id: 3, firstName: "A", lastName: "B", email: "a@x.com" }]);
    const result = await findVacantModuleStudentsForProject("ent-1", 4, 9);
    const where = mocks.prisma.user.findMany.mock.calls[0]?.[0]?.where;
    expect(result).toEqual([{ id: 3, firstName: "A", lastName: "B", email: "a@x.com" }]);
    expect(where.projectStudents).toEqual({ some: { projectId: 9 } });
  });

  it("findModuleStudentsForManualAllocation maps current team and numeric search", async () => {
    mocks.prisma.projectStudent.findFirst.mockResolvedValue(null);
    mocks.prisma.user.findMany.mockResolvedValue([
      {
        id: 42,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@x.com",
        teamAllocations: [{ team: { id: 7, teamName: "Blue" } }],
      },
    ]);
    const rows = await findModuleStudentsForManualAllocation("ent-1", 5, 8, " 42 ");
    const andFilters = mocks.prisma.user.findMany.mock.calls[0]?.[0]?.where?.AND;
    expect(rows).toEqual([
      {
        id: 42,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@x.com",
        currentTeamId: 7,
        currentTeamName: "Blue",
      },
    ]);
    expect(andFilters[0].OR).toEqual(expect.arrayContaining([expect.objectContaining({ id: 42 })]));
  });

  it("findInviteEligibleStudentsForTeam throws when team is missing", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue(null);
    await expect(findInviteEligibleStudentsForTeam(2, 7)).rejects.toEqual({ code: "TEAM_NOT_FOUND_OR_INACTIVE" });
  });

  it("findInviteEligibleStudentsForTeam throws when requester is not allocated", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue({
      id: 2,
      enterpriseId: "ent-1",
      projectId: 9,
      project: { moduleId: 3 },
    });
    mocks.prisma.teamAllocation.findUnique.mockResolvedValue(null);
    await expect(findInviteEligibleStudentsForTeam(2, 7)).rejects.toEqual({ code: "TEAM_ACCESS_FORBIDDEN" });
  });

  it("findInviteEligibleStudentsForTeam returns eligible students", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue({
      id: 2,
      enterpriseId: "ent-1",
      projectId: 9,
      project: { moduleId: 3 },
    });
    mocks.prisma.teamAllocation.findUnique.mockResolvedValue({ teamId: 2 });
    mocks.prisma.projectStudent.findFirst.mockResolvedValue(null);
    mocks.prisma.user.findMany.mockResolvedValue([{ id: 11, firstName: "M", lastName: "N", email: "m@n.com" }]);
    const result = await findInviteEligibleStudentsForTeam(2, 7);
    const where = mocks.prisma.user.findMany.mock.calls[0]?.[0]?.where;
    expect(result).toEqual([{ id: 11, firstName: "M", lastName: "N", email: "m@n.com" }]);
    expect(where.enterpriseId).toBe("ent-1");
  });

  it("findInviteEligibleStudentForTeamByEmail returns null when team is missing", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue(null);
    const row = await findInviteEligibleStudentForTeamByEmail(2, "x@y.com");
    expect(row).toBeNull();
    expect(mocks.prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("findInviteEligibleStudentForTeamByEmail queries by exact email", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue({
      enterpriseId: "ent-1",
      projectId: 9,
      project: { moduleId: 3 },
    });
    mocks.prisma.projectStudent.findFirst.mockResolvedValue(null);
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 99, firstName: "R", lastName: "S", email: "x@y.com" });
    await findInviteEligibleStudentForTeamByEmail(2, "x@y.com");
    const where = mocks.prisma.user.findFirst.mock.calls[0]?.[0]?.where;
    expect(where.email).toEqual({ equals: "x@y.com" });
  });

  it("findProjectTeamSummaries maps allocation counts", async () => {
    mocks.prisma.team.findMany.mockResolvedValue([{ id: 4, teamName: "Red", _count: { allocations: 3 } }]);
    const rows = await findProjectTeamSummaries(5);
    expect(rows).toEqual([{ id: 4, teamName: "Red", memberCount: 3 }]);
  });
});