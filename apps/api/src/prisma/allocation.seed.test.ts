import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    moduleLead: {
      createMany: vi.fn(),
    },
    userModule: {
      createMany: vi.fn(),
    },
    moduleTeachingAssistant: {
      createMany: vi.fn(),
    },
    teamAllocation: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(async (value: string) => `hash-${value}`),
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import {
  buildUsersByRole,
  planModuleLeadSeedData,
  planModuleTeachingAssistantSeedData,
  planStudentEnrollmentSeedData,
  planTeamAllocationSeedData,
  seedAdminTeamAllocation,
  seedAssessmentStudentModuleCoverage,
  seedGithubE2EUsers,
  seedModuleLeads,
  seedModuleTeachingAssistants,
  seedStudentEnrollments,
  seedTeamAllocations,
} from "../../prisma/seed/allocation";

describe("seed allocation planners", () => {
  it("buildUsersByRole separates staff/admin from students", () => {
    const users = [
      { id: 1, role: "STUDENT" as const },
      { id: 2, role: "STAFF" as const },
      { id: 3, role: "ENTERPRISE_ADMIN" as const },
      { id: 4, role: "ADMIN" as const },
    ];

    const grouped = buildUsersByRole(users);
    expect(grouped.students.map((u) => u.id)).toEqual([1]);
    expect(grouped.adminOrStaff.map((u) => u.id)).toEqual([2, 3, 4]);
  });

  it("planModuleLeadSeedData round-robins staff across modules", () => {
    const data = planModuleLeadSeedData(
      [{ id: 11, role: "STAFF" }, { id: 12, role: "STAFF" }] as any,
      [{ id: 100 }, { id: 101 }, { id: 102 }] as any,
    );
    expect(data).toEqual([
      { moduleId: 100, userId: 11 },
      { moduleId: 101, userId: 12 },
      { moduleId: 102, userId: 11 },
    ]);
  });

  it("planStudentEnrollmentSeedData creates cartesian enrollments", () => {
    const data = planStudentEnrollmentSeedData(
      "ent-1",
      [{ id: 1, role: "STUDENT" }, { id: 2, role: "STUDENT" }] as any,
      [{ id: 10 }, { id: 20 }] as any,
    );
    expect(data).toEqual([
      { enterpriseId: "ent-1", userId: 1, moduleId: 10 },
      { enterpriseId: "ent-1", userId: 1, moduleId: 20 },
      { enterpriseId: "ent-1", userId: 2, moduleId: 10 },
      { enterpriseId: "ent-1", userId: 2, moduleId: 20 },
    ]);
  });

  it("planTeamAllocationSeedData sorts teams and wraps students", () => {
    const data = planTeamAllocationSeedData(
      [{ id: 1, role: "STUDENT" }, { id: 2, role: "STUDENT" }, { id: 3, role: "STUDENT" }] as any,
      [{ id: 200, projectId: 2 }, { id: 100, projectId: 1 }] as any,
    );
    expect(data).toEqual([
      { userId: 1, teamId: 100 },
      { userId: 2, teamId: 200 },
      { userId: 3, teamId: 100 },
    ]);
  });

  it("planTeamAllocationSeedData skips invalid student/team rows", () => {
    const data = planTeamAllocationSeedData(
      [{ id: 1, role: "STUDENT" }, undefined] as any,
      [{ id: 100, projectId: 1 }, undefined] as any,
    );
    expect(data).toEqual([{ userId: 1, teamId: 100 }]);
  });

  it("planModuleTeachingAssistantSeedData avoids assigning module lead when alternatives exist", () => {
    const data = planModuleTeachingAssistantSeedData(
      [{ id: 1, role: "STAFF" }, { id: 2, role: "STAFF" }, { id: 3, role: "STAFF" }] as any,
      [{ id: 10 }, { id: 11 }] as any,
      [{ moduleId: 10, userId: 1 }, { moduleId: 11, userId: 2 }],
    );
    expect(data.find((row) => row.moduleId === 10)?.userId).not.toBe(1);
    expect(data.find((row) => row.moduleId === 11)?.userId).not.toBe(2);
  });

  it("planModuleTeachingAssistantSeedData falls back to full staff pool when only lead exists", () => {
    const data = planModuleTeachingAssistantSeedData(
      [{ id: 1, role: "STAFF" }] as any,
      [{ id: 10 }] as any,
      [{ moduleId: 10, userId: 1 }],
    );
    expect(data).toEqual([{ moduleId: 10, userId: 1 }]);
  });

  it("planModuleTeachingAssistantSeedData skips when no assignee can be selected", () => {
    const data = planModuleTeachingAssistantSeedData([] as any, [{ id: 10 }] as any, []);
    expect(data).toEqual([]);
  });
});

describe("seedAssessmentStudentModuleCoverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.moduleLead.createMany.mockResolvedValue({ count: 1 });
    prismaMock.userModule.createMany.mockResolvedValue({ count: 2 });
    prismaMock.moduleTeachingAssistant.createMany.mockResolvedValue({ count: 1 });
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 1 });
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.teamAllocation.findUnique.mockResolvedValue(null);
    prismaMock.teamAllocation.upsert.mockResolvedValue({});
    prismaMock.project.findFirst.mockResolvedValue({ id: 100 });
    prismaMock.project.findUnique.mockResolvedValue({ moduleId: 10 });
    prismaMock.team.findFirst.mockResolvedValue({ id: 200 });
    prismaMock.user.upsert.mockImplementation(async ({ create }: any) => ({ id: create.email.includes("staff") ? 901 : 902 }));
  });

  it("skips when dependencies are missing", async () => {
    const result = await seedAssessmentStudentModuleCoverage("ent-1", [], [], []);
    expect(result).toBeUndefined();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("skips when assessment student account is absent", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await seedAssessmentStudentModuleCoverage(
      "ent-1",
      [{ id: 1 }] as any,
      [{ id: 10, moduleId: 1, templateId: 1 }] as any,
      [{ id: 100, projectId: 10 }] as any,
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalled();
    expect(prismaMock.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("skips when module coverage has no team targets", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 7 });

    await seedAssessmentStudentModuleCoverage(
      "ent-1",
      [{ id: 999 }] as any,
      [{ id: 10, moduleId: 1, templateId: 1 }] as any,
      [{ id: 100, projectId: 10 }] as any,
    );

    expect(prismaMock.teamAllocation.findMany).not.toHaveBeenCalled();
    expect(prismaMock.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("skips when coverage is already satisfied", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 7 });
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 100 }, { teamId: 200 }]);

    await seedAssessmentStudentModuleCoverage(
      "ent-1",
      [{ id: 1 }, { id: 2 }] as any,
      [
        { id: 10, moduleId: 1, templateId: 1 },
        { id: 20, moduleId: 2, templateId: 1 },
      ] as any,
      [{ id: 100, projectId: 10 }, { id: 200, projectId: 20 }] as any,
    );

    expect(prismaMock.teamAllocation.createMany).not.toHaveBeenCalled();
  });

  it("creates missing allocations for uncovered modules", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 7 });
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ teamId: 100 }]);
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 1 });

    await seedAssessmentStudentModuleCoverage(
      "ent-1",
      [{ id: 1 }, { id: 2 }] as any,
      [
        { id: 10, moduleId: 1, templateId: 1 },
        { id: 20, moduleId: 2, templateId: 1 },
      ] as any,
      [{ id: 100, projectId: 10 }, { id: 200, projectId: 20 }] as any,
    );

    expect(prismaMock.teamAllocation.createMany).toHaveBeenCalledWith({
      data: [{ teamId: 200, userId: 7 }],
      skipDuplicates: true,
    });
  });
});

describe("allocation seed executors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.moduleLead.createMany.mockResolvedValue({ count: 1 });
    prismaMock.userModule.createMany.mockResolvedValue({ count: 2 });
    prismaMock.moduleTeachingAssistant.createMany.mockResolvedValue({ count: 1 });
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 1 });
    prismaMock.teamAllocation.findUnique.mockResolvedValue(null);
    prismaMock.teamAllocation.upsert.mockResolvedValue({});
    prismaMock.project.findFirst.mockResolvedValue({ id: 100 });
    prismaMock.project.findUnique.mockResolvedValue({ moduleId: 10 });
    prismaMock.team.findFirst.mockResolvedValue({ id: 200 });
    prismaMock.user.upsert.mockImplementation(async ({ create }: any) => ({ id: create.email.includes("staff") ? 901 : 902 }));
  });

  it("seedModuleLeads and seedStudentEnrollments handle skip and create paths", async () => {
    await expect(seedModuleLeads([], [{ id: 1 }] as any)).resolves.toBeUndefined();
    await expect(seedStudentEnrollments("ent-1", [], [{ id: 1 }] as any)).resolves.toBeUndefined();

    await seedModuleLeads([{ id: 10, role: "STAFF" }] as any, [{ id: 1 }] as any);
    await seedStudentEnrollments(
      "ent-1",
      [{ id: 20, role: "STUDENT" }] as any,
      [{ id: 1 }] as any,
    );

    expect(prismaMock.moduleLead.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 1, userId: 10 }],
      skipDuplicates: true,
    });
    expect(prismaMock.userModule.createMany).toHaveBeenCalledWith({
      data: [{ enterpriseId: "ent-1", userId: 20, moduleId: 1 }],
      skipDuplicates: true,
    });
  });

  it("seedModuleTeachingAssistants and seedTeamAllocations cover skip/create branches", async () => {
    await expect(seedModuleTeachingAssistants([], [{ id: 1 }] as any)).resolves.toBeUndefined();
    await expect(seedModuleTeachingAssistants([{ id: 10, role: "STAFF" }] as any, [undefined] as any)).resolves.toBeUndefined();
    await expect(seedTeamAllocations([], [{ id: 1, projectId: 1 }] as any)).resolves.toBeUndefined();

    await seedModuleTeachingAssistants(
      [{ id: 10, role: "STAFF" }, { id: 11, role: "STAFF" }] as any,
      [{ id: 1 }] as any,
    );
    await seedTeamAllocations(
      [{ id: 20, role: "STUDENT" }] as any,
      [{ id: 300, projectId: 1 }] as any,
    );

    expect(prismaMock.moduleTeachingAssistant.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 1, userId: 11 }],
      skipDuplicates: true,
    });
    expect(prismaMock.teamAllocation.createMany).toHaveBeenCalledWith({
      data: [{ userId: 20, teamId: 300 }],
      skipDuplicates: true,
    });
  });

  it("seedAdminTeamAllocation handles missing dependencies and existing/new allocation", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await seedAdminTeamAllocation("ent-1");

    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 });
    prismaMock.project.findFirst.mockResolvedValueOnce(null);
    await seedAdminTeamAllocation("ent-1");

    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 });
    prismaMock.project.findFirst.mockResolvedValueOnce({ id: 100 });
    prismaMock.team.findFirst.mockResolvedValueOnce(null);
    await seedAdminTeamAllocation("ent-1");

    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 });
    prismaMock.project.findFirst.mockResolvedValueOnce({ id: 100 });
    prismaMock.team.findFirst.mockResolvedValueOnce({ id: 200 });
    prismaMock.teamAllocation.findUnique.mockResolvedValueOnce({ userId: 1 });
    await seedAdminTeamAllocation("ent-1");

    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 });
    prismaMock.project.findFirst.mockResolvedValueOnce({ id: 100 });
    prismaMock.team.findFirst.mockResolvedValueOnce({ id: 200 });
    prismaMock.teamAllocation.findUnique.mockResolvedValueOnce(null);
    await seedAdminTeamAllocation("ent-1");

    expect(prismaMock.teamAllocation.upsert).toHaveBeenCalledTimes(2);
  });

  it("seedGithubE2EUsers handles skip and creation paths with optional module enrollment", async () => {
    await seedGithubE2EUsers("ent-1", [], [{ id: 200, projectId: 100 }]);
    await seedGithubE2EUsers("ent-1", [{ id: 100, moduleId: 10, templateId: 1 }], []);

    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.teamAllocation.findUnique.mockResolvedValueOnce(null);
    prismaMock.project.findUnique.mockResolvedValueOnce({ moduleId: 10 });

    await seedGithubE2EUsers(
      "ent-1",
      [{ id: 100, moduleId: 10, templateId: 1 }],
      [{ id: 200, projectId: 100 }],
    );
    expect(prismaMock.user.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.userModule.createMany).toHaveBeenCalled();
    expect(prismaMock.moduleLead.createMany).toHaveBeenCalled();

    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: 901 })
      .mockResolvedValueOnce({ id: 902 });
    prismaMock.teamAllocation.findUnique.mockResolvedValueOnce({ userId: 902 });
    prismaMock.project.findUnique.mockResolvedValueOnce(null);

    await seedGithubE2EUsers(
      "ent-1",
      [{ id: 100, moduleId: 10, templateId: 1 }],
      [{ id: 200, projectId: 100 }],
    );
    expect(prismaMock.userModule.createMany).toHaveBeenCalledTimes(1);
  });
});
