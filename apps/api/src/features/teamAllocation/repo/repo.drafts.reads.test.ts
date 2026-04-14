import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    team: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    teamAllocation: { findMany: vi.fn() },
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import {
  findDraftTeamById,
  findDraftTeamInProject,
  findModuleStudentsByIdsInModule,
  findProjectDraftTeams,
  findStudentAllocationConflictsInProject,
  findTeamNameConflictInProject,
} from "./repo.drafts.reads.js";

describe("repo.drafts.reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findProjectDraftTeams maps and sorts members", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    mocks.prisma.team.findMany.mockResolvedValue([
      {
        id: 1,
        teamName: "Draft 1",
        createdAt,
        updatedAt,
        draftCreatedBy: null,
        allocations: [
          { user: { id: 2, firstName: "B", lastName: "Beta", email: "b@x.com" } },
          { user: { id: 1, firstName: "A", lastName: "Alpha", email: "a@x.com" } },
        ],
        _count: { allocations: 2 },
      },
    ]);
    const rows = await findProjectDraftTeams(9);
    expect(rows[0]?.memberCount).toBe(2);
    expect(rows[0]?.members.map((member) => member.id)).toEqual([1, 2]);
  });

  it("findProjectDraftTeams applies id tie-breaker for identical names", async () => {
    mocks.prisma.team.findMany.mockResolvedValue([
      {
        id: 2,
        teamName: "Draft 2",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        draftCreatedBy: null,
        allocations: [
          { user: { id: 9, firstName: "A", lastName: "Same", email: "a1@x.com" } },
          { user: { id: 3, firstName: "A", lastName: "Same", email: "a2@x.com" } },
        ],
        _count: { allocations: 2 },
      },
    ]);
    const rows = await findProjectDraftTeams(9);
    expect(rows[0]?.members.map((member) => member.id)).toEqual([3, 9]);
  });

  it("findDraftTeamInProject filters by draft lifecycle", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue({ id: 4 });
    await findDraftTeamInProject(9, 4);
    const where = mocks.prisma.team.findFirst.mock.calls[0]?.[0]?.where;
    expect(where).toEqual(expect.objectContaining({ id: 4, projectId: 9, allocationLifecycle: "DRAFT" }));
  });

  it("findDraftTeamById returns null for non-draft teams", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ archivedAt: null, allocationLifecycle: "ACTIVE" });
    await expect(findDraftTeamById(1)).resolves.toBeNull();
  });

  it("findDraftTeamById maps draft team rows", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({
      id: 3,
      teamName: "Draft 3",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
      archivedAt: null,
      allocationLifecycle: "DRAFT",
      draftCreatedBy: { id: 8, firstName: "L", lastName: "M", email: "l@m.com" },
      allocations: [{ user: { id: 7, firstName: "S", lastName: "T", email: "s@t.com" } }],
      _count: { allocations: 1 },
    });
    const team = await findDraftTeamById(3);
    expect(team).toEqual(expect.objectContaining({ id: 3, memberCount: 1 }));
  });

  it("findTeamNameConflictInProject handles excludeTeamId", async () => {
    mocks.prisma.team.findFirst.mockResolvedValue({ id: 6 });
    await expect(findTeamNameConflictInProject(9, "Blue", { excludeTeamId: 2 })).resolves.toBe(true);
    const where = mocks.prisma.team.findFirst.mock.calls[0]?.[0]?.where;
    expect(where.projectId).toBe(9);
    expect(where.id).toEqual({ not: 2 });
  });

  it("findModuleStudentsByIdsInModule skips query for empty student ids", async () => {
    const rows = await findModuleStudentsByIdsInModule("ent-1", 10, [], 99);
    expect(rows).toEqual([]);
    expect(mocks.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("findModuleStudentsByIdsInModule queries active students on the project", async () => {
    mocks.prisma.user.findMany.mockResolvedValue([{ id: 4 }]);
    await expect(findModuleStudentsByIdsInModule("ent-1", 10, [4, 5], 7)).resolves.toEqual([{ id: 4 }]);
    expect(mocks.prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: [4, 5] },
          enterpriseId: "ent-1",
          role: "STUDENT",
          projectStudents: { some: { projectId: 7 } },
        }),
      }),
    );
  });

  it("findStudentAllocationConflictsInProject skips query for empty student ids", async () => {
    const rows = await findStudentAllocationConflictsInProject(5, [], "ACTIVE");
    expect(rows).toEqual([]);
    expect(mocks.prisma.teamAllocation.findMany).not.toHaveBeenCalled();
  });

  it("findStudentAllocationConflictsInProject maps conflict rows", async () => {
    mocks.prisma.teamAllocation.findMany.mockResolvedValue([
      {
        userId: 11,
        user: { firstName: "A", lastName: "B", email: "a@b.com" },
        team: { id: 4, teamName: "Blue" },
      },
    ]);
    const rows = await findStudentAllocationConflictsInProject(5, [11], "ACTIVE", { excludeTeamId: 2 });
    expect(rows).toEqual([
      { userId: 11, firstName: "A", lastName: "B", email: "a@b.com", teamId: 4, teamName: "Blue" },
    ]);
  });
});
