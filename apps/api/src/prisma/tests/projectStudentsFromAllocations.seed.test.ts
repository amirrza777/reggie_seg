import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    teamAllocation: {
      findMany: vi.fn(),
    },
    projectStudent: {
      createMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import {
  ensureProjectStudentsFromTeamAllocations,
  seedSyncProjectStudentsFromTeamAllocations,
} from "../../../prisma/seed/steps/projectStudentsFromAllocations";

describe("projectStudentsFromAllocations seed step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.projectStudent.createMany.mockResolvedValue({ count: 0 });
    prismaMock.project.findMany.mockResolvedValue([]);
  });

  it("returns 0 when no allocated users exist for the project", async () => {
    const created = await ensureProjectStudentsFromTeamAllocations(42);

    expect(created).toBe(0);
    expect(prismaMock.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        team: {
          projectId: 42,
        },
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    expect(prismaMock.projectStudent.createMany).not.toHaveBeenCalled();
  });

  it("creates missing projectStudent rows from team allocations", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ userId: 7 }, { userId: 11 }]);
    prismaMock.projectStudent.createMany.mockResolvedValue({ count: 2 });

    const created = await ensureProjectStudentsFromTeamAllocations(101);

    expect(created).toBe(2);
    expect(prismaMock.projectStudent.createMany).toHaveBeenCalledWith({
      data: [
        { projectId: 101, userId: 7 },
        { projectId: 101, userId: 11 },
      ],
      skipDuplicates: true,
    });
  });

  it("scans enterprise projects and aggregates seeded row count", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    prismaMock.project.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }, { id: 13 }]);
    prismaMock.teamAllocation.findMany
      .mockResolvedValueOnce([{ userId: 1 }, { userId: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: 5 }]);
    prismaMock.projectStudent.createMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });

    const value = await seedSyncProjectStudentsFromTeamAllocations("ent-1");

    expect(value).toBeUndefined();
    expect(prismaMock.project.findMany).toHaveBeenCalledWith({
      where: { module: { enterpriseId: "ent-1" } },
      select: { id: true },
    });
    expect(prismaMock.teamAllocation.findMany).toHaveBeenCalledTimes(3);
    expect(prismaMock.teamAllocation.findMany).toHaveBeenNthCalledWith(1, {
      where: { team: { projectId: 11 } },
      select: { userId: true },
      distinct: ["userId"],
    });
    expect(prismaMock.teamAllocation.findMany).toHaveBeenNthCalledWith(2, {
      where: { team: { projectId: 12 } },
      select: { userId: true },
      distinct: ["userId"],
    });
    expect(prismaMock.teamAllocation.findMany).toHaveBeenNthCalledWith(3, {
      where: { team: { projectId: 13 } },
      select: { userId: true },
      distinct: ["userId"],
    });
    expect(prismaMock.projectStudent.createMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.projectStudent.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        { projectId: 11, userId: 1 },
        { projectId: 11, userId: 2 },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.projectStudent.createMany).toHaveBeenNthCalledWith(2, {
      data: [{ projectId: 13, userId: 5 }],
      skipDuplicates: true,
    });

    logSpy.mockRestore();
  });
});
