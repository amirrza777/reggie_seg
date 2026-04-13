import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, planJoinCodeMock, buildModuleContentMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      createMany: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    module: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    questionnaireTemplate: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    project: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    team: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
  planJoinCodeMock: vi.fn((index: number) => `JC-${index}`),
  buildModuleContentMock: vi.fn((name: string, index: number) => ({
    learningOutcomes: `${name}-${index}`,
  })),
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

vi.mock("../../prisma/seed/joinCodes", () => ({
  planSeedModuleJoinCode: planJoinCodeMock,
}));

vi.mock("../../prisma/seed/moduleContent", () => ({
  buildSeedModuleContent: buildModuleContentMock,
}));

import {
  planModuleSeedData,
  planProjectSeedRows,
  planQuestionnaireTemplateSeedData,
  planTemplateQuestionData,
  planTeamSeedRows,
  planUserSeedData,
  seedProjects,
  seedQuestionnaireTemplates,
  seedTeams,
  seedUsers,
} from "../../prisma/seed/catalog";

describe("catalog planners", () => {
  it("builds user seed rows with enterprise/password", () => {
    const rows = planUserSeedData("ent-1", "hash-1");
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every((row) => row.enterpriseId === "ent-1")).toBe(true);
    expect(rows.every((row) => row.passwordHash === "hash-1")).toBe(true);
  });

  it("builds module seed rows with generated code/join code/content", () => {
    const rows = planModuleSeedData("ent-2");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        enterpriseId: "ent-2",
        code: "MOD-1",
        joinCode: "JC-0",
        learningOutcomes: expect.any(String),
      }),
    );
    expect(planJoinCodeMock).toHaveBeenCalled();
    expect(buildModuleContentMock).toHaveBeenCalled();
  });

  it("builds project/team rows using fallback entities when indexes are out of bounds", () => {
    const projects = planProjectSeedRows(
      [{ id: 10 }],
      [{ id: 500, questionLabels: [] }],
      { id: 10 },
      { id: 500, questionLabels: [] },
    );
    expect(projects.length).toBeGreaterThan(0);
    expect(projects.every((row) => row.moduleId === 10)).toBe(true);
    expect(projects.every((row) => row.questionnaireTemplateId === 500)).toBe(true);

    const teams = planTeamSeedRows("ent-1", [{ id: 99, projectId: 10 }], { id: 99, projectId: 10 });
    expect(teams.length).toBeGreaterThan(0);
    expect(teams.every((row) => row.projectId === 99)).toBe(true);
    expect(teams.every((row) => row.enterpriseId === "ent-1")).toBe(true);
  });

  it("builds project rows with default template when templates list is empty", () => {
    const projects = planProjectSeedRows([{ id: 10 }], [], { id: 10 }, { id: 500, questionLabels: [] });
    expect(projects.every((row) => row.questionnaireTemplateId === 500)).toBe(true);
  });

  it("builds template question rows with stable order", () => {
    expect(planTemplateQuestionData(["A", "B"])).toEqual([
      { label: "A", type: "text", order: 1 },
      { label: "B", type: "text", order: 2 },
    ]);
    expect(planQuestionnaireTemplateSeedData().length).toBeGreaterThan(0);
  });
});

describe("catalog seeders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.createMany.mockResolvedValue({ count: 2 });
    prismaMock.user.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.user.findMany.mockResolvedValue([
      { id: 1, role: "STUDENT", firstName: "A", lastName: "B" },
      { id: 2, role: "STAFF", firstName: "C", lastName: "D" },
    ]);
    prismaMock.project.createMany.mockResolvedValue({ count: 2 });
    prismaMock.project.findMany.mockResolvedValue([
      { id: 100, moduleId: 10, questionnaireTemplateId: 500 },
      { id: 101, moduleId: 11, questionnaireTemplateId: 501 },
    ]);
    prismaMock.team.createMany.mockResolvedValue({ count: 2 });
    prismaMock.team.findMany.mockResolvedValue([
      { id: 200, projectId: 100, teamName: "T1" },
      { id: 201, projectId: 101, teamName: "T2" },
    ]);
  });

  it("seeds users and returns normalized seed users", async () => {
    const users = await seedUsers("ent-1", "hash-1");
    expect(prismaMock.user.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
    expect(users).toEqual([
      { id: 1, role: "STUDENT", firstName: "A", lastName: "B" },
      { id: 2, role: "STAFF", firstName: "C", lastName: "D" },
    ]);
  });

  it("seedQuestionnaireTemplates skips without owner", async () => {
    const templates = await seedQuestionnaireTemplates(undefined);
    expect(templates).toEqual([]);
    expect(prismaMock.questionnaireTemplate.create).not.toHaveBeenCalled();
  });

  it("seedQuestionnaireTemplates updates existing and creates missing templates", async () => {
    let findCall = 0;
    let createId = 1000;
    prismaMock.questionnaireTemplate.findFirst.mockImplementation(async () => (findCall++ === 0 ? { id: 777 } : null));
    prismaMock.questionnaireTemplate.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      questions: data.questions.create.map((q: any) => ({ label: q.label })),
    }));
    prismaMock.questionnaireTemplate.create.mockImplementation(async ({ data }: any) => ({
      id: createId++,
      questions: data.questions.create.map((q: any) => ({ label: q.label })),
    }));

    const templates = await seedQuestionnaireTemplates(42);

    expect(prismaMock.questionnaireTemplate.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.questionnaireTemplate.create).toHaveBeenCalledTimes(templates.length - 1);
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0]?.id).toBeDefined();
  });

  it("seedProjects handles skip branches and normal creation", async () => {
    expect(await seedProjects([], [{ id: 1, questionLabels: [] }])).toEqual([]);
    expect(await seedProjects([{ id: 1 }], [])).toEqual([]);
    expect(await seedProjects([undefined as unknown as { id: number }], [{ id: 1, questionLabels: [] } as never])).toEqual(
      [],
    );

    const projects = await seedProjects(
      [{ id: 10 }, { id: 11 }],
      [
        { id: 500, questionLabels: [] },
        { id: 501, questionLabels: [] },
      ],
    );
    expect(projects).toEqual([
      { id: 100, moduleId: 10, templateId: 500 },
      { id: 101, moduleId: 11, templateId: 501 },
    ]);
    expect(prismaMock.project.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  it("seedTeams handles skip branches and normal creation", async () => {
    expect(await seedTeams("ent-1", [])).toEqual([]);
    expect(await seedTeams("ent-1", [undefined as unknown as { id: number; projectId: number }])).toEqual([]);

    const teams = await seedTeams("ent-1", [
      { id: 100, projectId: 10 },
      { id: 101, projectId: 11 },
    ]);

    expect(teams).toEqual([
      { id: 200, projectId: 100 },
      { id: 201, projectId: 101 },
    ]);
    expect(prismaMock.team.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });
});
