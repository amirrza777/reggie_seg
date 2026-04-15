import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    questionnaireTemplate: { update: vi.fn() },
    teamAllocation: { findMany: vi.fn(), createMany: vi.fn() },
    question: { findMany: vi.fn() },
    peerFeedback: { deleteMany: vi.fn() },
    peerAssessment: { deleteMany: vi.fn(), upsert: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedAssessmentStudentModuleCoverage } from "../../../prisma/seed/allocation/assessmentCoverage";
import { getTemplateQuestionLabels as getPeerScenarioLabels } from "../../../prisma/seed/peerAssessmentScenario/assessments";
import { getTemplateQuestionLabels as getTeamHealthLabels, seedPartialPeerAssessments } from "../../../prisma/seed/teamHealthScenario/assessments";
import { resolveScenarioSeedTarget } from "../../../prisma/seed/peerAssessmentScenario/target";
import { buildPrismaMock } from "../seed.script.shared.impl";

describe("seed coverage branch cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: 7 });
    prismaMock.questionnaireTemplate.update.mockResolvedValue({ id: 21, purpose: "PEER_ASSESSMENT" });
    prismaMock.teamAllocation.findMany.mockResolvedValue([]);
    prismaMock.teamAllocation.createMany.mockResolvedValue({ count: 1 });
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.peerFeedback.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.peerAssessment.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.peerAssessment.upsert.mockResolvedValue({ id: 1 });
    prismaMock.peerAssessment.create.mockResolvedValue({ id: 1 });
  });

  it("covers assessment coverage target fallbacks (no project/no team)", async () => {
    const modules = [{ id: 1 }];
    const projects = [{ id: 20, moduleId: 2, templateId: 9 }];
    const teams = [{ id: 30, projectId: 99 }];

    await expect(seedAssessmentStudentModuleCoverage("ent-1", modules, projects, teams)).resolves.toBeUndefined();

    await expect(
      seedAssessmentStudentModuleCoverage(
        "ent-1",
        [{ id: 1 }],
        [{ id: 20, moduleId: 1, templateId: 9 }],
        [{ id: 30, projectId: 99 }],
      ),
    ).resolves.toBeUndefined();

    await expect(
      seedAssessmentStudentModuleCoverage(
        "ent-1",
        [undefined as never],
        [{ id: 20, moduleId: 1, templateId: 9 }],
        [{ id: 30, projectId: 20 }],
      ),
    ).resolves.toBeUndefined();
  });

  it("covers peerAssessment question-label fallback branch", async () => {
    prismaMock.question.findMany.mockResolvedValueOnce([{ label: "From DB" }]);
    await expect(getPeerScenarioLabels(21, ["Fallback"])).resolves.toEqual(["From DB"]);

    prismaMock.question.findMany.mockResolvedValueOnce([]);
    await expect(getPeerScenarioLabels(21, ["Fallback"])).resolves.toEqual(["Fallback"]);

    prismaMock.question.findMany.mockResolvedValueOnce([]);
    await expect(getPeerScenarioLabels(21, [])).resolves.toEqual(["Overall contribution"]);
  });

  it("covers teamHealth assessment fallback labels and self/invalid skip branch", async () => {
    prismaMock.question.findMany.mockResolvedValueOnce([]);
    await expect(getTeamHealthLabels(21)).resolves.toEqual(["Overall contribution"]);

    // Includes invalid/repeated IDs to exercise skip logic in peer-assessment creation loop.
    const created = await seedPartialPeerAssessments(1, 2, 3, [1, 0, 1]);
    expect(created).toBe(0);
  });

  it("covers scenario target not-enough-members branch via invalid IDs", async () => {
    await expect(
      resolveScenarioSeedTarget({
        enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
        passwordHash: "x",
        users: [{ id: 0, role: "STUDENT", email: "student.assessment@example.com" }],
        standardUsers: [],
        assessmentAccounts: [],
        usersByRole: {
          adminOrStaff: [],
          students: [{ id: 0, role: "STUDENT", email: "s0@example.com" }],
        },
        modules: [{ id: 11 }],
        templates: [{ id: 21, questionLabels: ["Q1"] }],
        projects: [],
        teams: [],
      }),
    ).resolves.toEqual({
      ready: false,
      result: { value: undefined, rows: 0, details: "skipped (not enough team members)" },
    });
  });

  it("covers scenario target path when context users array is missing", async () => {
    await expect(
      resolveScenarioSeedTarget({
        enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
        passwordHash: "x",
        users: undefined as never,
        standardUsers: [],
        assessmentAccounts: [],
        usersByRole: {
          adminOrStaff: [],
          students: [
            { id: 101, role: "STUDENT", email: "s1@example.com" },
            { id: 102, role: "STUDENT", email: "s2@example.com" },
          ],
        },
        modules: [{ id: 11 }],
        templates: [{ id: 21, questionLabels: ["Q1"] }],
        projects: [],
        teams: [],
      }),
    ).resolves.toEqual({
      ready: true,
      module: { id: 11 },
      template: { id: 21, questionLabels: ["Q1"] },
      memberIds: [101, 102],
    });
  });

  it("covers non-github user lookup branch in seed.script.shared.impl", async () => {
    const mock = buildPrismaMock();
    await expect(
      mock.user.findUnique({
        where: { enterpriseId_email: { enterpriseId: "ent-1", email: "someone@example.com" } },
      }),
    ).resolves.toEqual({ id: 999 });
  });
});
