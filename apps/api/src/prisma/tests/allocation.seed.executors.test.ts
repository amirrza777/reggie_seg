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

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import {
  seedAdminTeamAllocation,
  seedGithubE2EUsers,
  seedModuleLeads,
  seedModuleTeachingAssistants,
  seedStudentEnrollments,
  seedTeamAllocations,
} from "../../../prisma/seed/allocation";

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
    prismaMock.user.upsert.mockImplementation(async ({ create }: { create: { email: string } }) =>
      ({ id: create.email.includes("staff") ? 901 : 902 }),
    );
  });

  it("seedModuleLeads and seedStudentEnrollments handle skip and create paths", async () => {
    await expect(seedModuleLeads([], [{ id: 1 }] as never[])).resolves.toBeUndefined();
    await expect(seedStudentEnrollments("ent-1", [], [{ id: 1 }] as never[])).resolves.toBeUndefined();

    await seedModuleLeads([{ id: 10, role: "STAFF" }] as never[], [{ id: 1 }] as never[]);
    await seedStudentEnrollments(
      "ent-1",
      [{ id: 20, role: "STUDENT" }] as never[],
      [{ id: 1 }] as never[],
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
    await expect(seedModuleTeachingAssistants([], [{ id: 1 }] as never[])).resolves.toBeUndefined();
    await expect(seedModuleTeachingAssistants([{ id: 10, role: "STAFF" }] as never[], [undefined] as never[])).resolves.toBeUndefined();
    await expect(seedTeamAllocations([], [{ id: 1, projectId: 1 }] as never[])).resolves.toBeUndefined();

    await seedModuleTeachingAssistants(
      [{ id: 10, role: "STAFF" }, { id: 11, role: "STAFF" }] as never[],
      [{ id: 1 }] as never[],
    );
    await seedTeamAllocations(
      [{ id: 20, role: "STUDENT" }] as never[],
      [{ id: 300, projectId: 1 }] as never[],
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
    await seedGithubE2EUsers("ent-1", [], [{ id: 200, projectId: 100 }] as never[]);
    await seedGithubE2EUsers("ent-1", [{ id: 100, moduleId: 10, templateId: 1 }] as never[], []);

    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.teamAllocation.findUnique.mockResolvedValueOnce(null);
    prismaMock.project.findUnique.mockResolvedValueOnce({ moduleId: 10 });

    await seedGithubE2EUsers(
      "ent-1",
      [{ id: 100, moduleId: 10, templateId: 1 }] as never[],
      [{ id: 200, projectId: 100 }] as never[],
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
      [{ id: 100, moduleId: 10, templateId: 1 }] as never[],
      [{ id: 200, projectId: 100 }] as never[],
    );
    expect(prismaMock.userModule.createMany).toHaveBeenCalledTimes(1);
  });
});
